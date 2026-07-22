import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Download, Loader2, Receipt, AlertCircle, Eye, X, CheckCircle2,
  Clock, AlertTriangle, ShoppingBag,
} from "lucide-react";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import logoUrl from "@/assets/logo.png";

export const Route = createFileRoute("/dashboard/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices | Client Dashboard" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InvoicesPage,
});

type PaymentInfo = {
  method: string;
  reference: string | null;
  mpesa_receipt: string | null;
  paid_at: string | null;
};

type OrderItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type InvoiceRow = {
  id: string;
  order_number: string;
  invoice_number: string | null;
  item_name: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  payment_status: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  payment: PaymentInfo | null;
  items: OrderItem[];
};

type PayChannel = {
  kind: string;
  label: string;
  account_name: string | null;
  identifier: string | null;
  extra: string | null;
};

/** Logo files in /public, keyed by channel kind. */
const KIND_LOGO: Record<string, string> = {
  paybill: "/paybill.png",
  till: "/till.png",
  send_money: "/M-pesa.png",
  bank: "/Equitybank.png",
  cheque: "/Cheque.png",
};

async function fetchPayChannels(): Promise<PayChannel[]> {
  const { data, error } = await supabase
    .from("payment_channels")
    .select("kind, label, account_name, identifier, extra")
    .eq("is_active", true)
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as PayChannel[];
}

type InvoiceDisplayStatus = "Paid" | "Unpaid" | "Overdue";

const NAVY = [10, 37, 64] as const;
const ORANGE = [249, 115, 22] as const;
const GRAY = [110, 120, 130] as const;

const DUE_DAYS = 7;

async function fetchInvoices(userId: string): Promise<InvoiceRow[]> {
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, order_number, invoice_number, item_name, subtotal, delivery_fee, total, currency, payment_status, created_at, customer_name, customer_email"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (ordersError) throw ordersError;
  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);

  // Payments and line items in parallel.
  const [{ data: payments }, { data: lineItems }] = await Promise.all([
    supabase
      .from("payments")
      .select("order_id, method, reference, mpesa_receipt, paid_at, created_at")
      .in("order_id", orderIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("order_items")
      .select("order_id, product_name, quantity, unit_price, line_total")
      .in("order_id", orderIds),
  ]);

  const paymentByOrder = new Map<string, PaymentInfo>();
  for (const p of payments ?? []) {
    if (!paymentByOrder.has(p.order_id)) {
      paymentByOrder.set(p.order_id, {
        method: p.method,
        reference: p.reference,
        mpesa_receipt: p.mpesa_receipt,
        paid_at: p.paid_at,
      });
    }
  }

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const it of (lineItems ?? []) as any[]) {
    const list = itemsByOrder.get(it.order_id) ?? [];
    list.push({
      product_name: it.product_name,
      quantity: it.quantity,
      unit_price: Number(it.unit_price ?? 0),
      line_total: Number(it.line_total ?? 0),
    });
    itemsByOrder.set(it.order_id, list);
  }

  return orders.map((o) => ({
    ...o,
    payment: paymentByOrder.get(o.id) ?? null,
    items: itemsByOrder.get(o.id) ?? [],
  })) as InvoiceRow[];
}

function dueDate(createdAt: string) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + DUE_DAYS);
  return d;
}

function displayStatus(inv: InvoiceRow): InvoiceDisplayStatus {
  if ((inv.payment_status ?? "").toLowerCase() === "paid") return "Paid";
  return dueDate(inv.created_at).getTime() < Date.now() ? "Overdue" : "Unpaid";
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(d: Date) {
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currency || "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

/** Every invoice needs a description. Fall back through the sensible options. */
function describeInvoice(inv: InvoiceRow): string {
  if (inv.items.length === 1) return inv.items[0].product_name;
  if (inv.items.length > 1) return `${inv.items.length} items`;
  return inv.item_name || `Order ${inv.order_number}`;
}

async function loadImageAsDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function scaleAndCompressWithRetina(
  url: string,
  targetWidth = 220
): Promise<{ dataUrl: string; width: number; height: number }> {
  try {
    const rawDataUrl = await loadImageAsDataUrl(url);
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const aspectRatio = img.naturalHeight / img.naturalWidth;
        const targetHeight = targetWidth * aspectRatio;
        const retinaScale = 2;
        canvas.width = targetWidth * retinaScale;
        canvas.height = targetHeight * retinaScale;
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.85),
          width: targetWidth,
          height: targetHeight,
        });
      };
      img.onerror = reject;
      img.src = rawDataUrl;
    });
  } catch {
    // A missing logo must never stop an invoice downloading.
    return { dataUrl: "", width: 0, height: 0 };
  }
}

async function buildInvoicePdf(inv: InvoiceRow, channels: PayChannel[] = []): Promise<jsPDF> {
  const status = displayStatus(inv);
  const invNumber = inv.invoice_number ?? inv.order_number;
  const issuedAt = new Date(inv.created_at);
  const due = dueDate(inv.created_at);

  const deliveryFee = Number(inv.delivery_fee) || 0;
  const totalVal = Number(inv.total) || 0;
  const subtotalVal = Number(inv.subtotal) || totalVal - deliveryFee;

  const qrText = [
    `Invoice: ${invNumber}`,
    `Order: ${inv.order_number}`,
    `Amount: ${formatMoney(totalVal, inv.currency)}`,
    `Issued: ${formatDateTime(issuedAt)}`,
  ].join("\n");

  // Only unpaid invoices need the how-to-pay block.
  const showHowToPay = status !== "Paid" && channels.length > 0;
  const payChannels = showHowToPay ? channels.slice(0, 4) : [];

  const [logoResult, qrDataUrl, channelLogos] = await Promise.all([
    scaleAndCompressWithRetina(logoUrl, 200),
    QRCode.toDataURL(qrText, { margin: 1, width: 160, color: { dark: "#0A2540" } }).catch(() => ""),
    Promise.all(
      payChannels.map((c) =>
        KIND_LOGO[c.kind]
          ? scaleAndCompressWithRetina(KIND_LOGO[c.kind], 90).catch(() => ({ dataUrl: "", width: 0, height: 0 }))
          : Promise.resolve({ dataUrl: "", width: 0, height: 0 })
      )
    ),
  ]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  let logoHeight = 55;
  if (logoResult.dataUrl) {
    logoHeight = logoResult.height;
    doc.addImage(logoResult.dataUrl, "JPEG", margin, 40, logoResult.width, logoResult.height, undefined, "FAST");
  } else {
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("PROTOCOL PROMOTIONS", margin, 62);
    doc.setFontSize(8.5);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.setFont("helvetica", "normal");
    doc.text("BRANDING AND MERCHANDISE", margin, 76);
  }

  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth - margin, 60, { align: "right" });

  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice: ${invNumber}`, pageWidth - margin, 80, { align: "right" });
  doc.text(`Order: ${inv.order_number}`, pageWidth - margin, 94, { align: "right" });
  doc.text(`Issued: ${formatDate(issuedAt)}`, pageWidth - margin, 108, { align: "right" });
  doc.text(`Due: ${formatDate(due)}`, pageWidth - margin, 122, { align: "right" });

  let y = Math.max(40 + logoHeight, 140) + 30;

  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.text("Bill to", margin, y);
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(inv.customer_name || "Customer", margin, y + 16);
  doc.text(inv.customer_email || "", margin, y + 30);

  const colRightX = 340;
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.text("Protocol Promotions Ltd.", colRightX, y);
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Nairobi, Kenya", colRightX, y + 16);
  doc.text("+254 762 446 077", colRightX, y + 30);
  doc.text("protocolpromotions@gmail.com", colRightX, y + 44);

  const badge =
    status === "Paid"
      ? { text: [21, 128, 61], bg: [240, 253, 244], border: [187, 247, 208] }
      : status === "Overdue"
        ? { text: [185, 28, 28], bg: [254, 242, 242], border: [254, 202, 202] }
        : { text: [194, 65, 12], bg: [255, 247, 237], border: [254, 215, 170] };

  const badgeY = y + 62;
  doc.setFillColor(badge.bg[0], badge.bg[1], badge.bg[2]);
  doc.setDrawColor(badge.border[0], badge.border[1], badge.border[2]);
  doc.setLineWidth(1);
  doc.roundedRect(margin, badgeY, 72, 18, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(badge.text[0], badge.text[1], badge.text[2]);
  doc.text(status.toUpperCase(), margin + 36, badgeY + 12, { align: "center" });

  y = badgeY + 34;

  if (status === "Paid" && inv.payment) {
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Paid via ${inv.payment.method}`, margin, y);
    if (inv.payment.paid_at) {
      doc.text(`on ${formatDateTime(new Date(inv.payment.paid_at))}`, margin, y + 13);
      y += 13;
    }
    const ref = inv.payment.mpesa_receipt ?? inv.payment.reference;
    if (ref) {
      doc.text(`Reference ${ref}`, margin, y + 13);
      y += 13;
    }
    y += 20;
  } else {
    y += 12;
  }

  // Line items table
  y += 20;
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(1.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text("Description", margin, y);
  doc.text("Qty", 380, y, { align: "right" });
  doc.text("Amount", pageWidth - margin, y, { align: "right" });
  y += 8;
  doc.setDrawColor(220);
  doc.setLineWidth(0.75);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  doc.setTextColor(60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);

  if (inv.items.length > 0) {
    for (const item of inv.items) {
      const name = doc.splitTextToSize(item.product_name, 300) as string[];
      doc.text(name[0], margin, y);
      doc.text(String(item.quantity), 380, y, { align: "right" });
      doc.text(formatMoney(item.line_total, inv.currency), pageWidth - margin, y, { align: "right" });
      y += 18;
      if (y > 700) {
        doc.addPage();
        y = 60;
      }
    }
  } else {
    doc.text(describeInvoice(inv), margin, y);
    doc.text(formatMoney(subtotalVal, inv.currency), pageWidth - margin, y, { align: "right" });
    y += 18;
  }

  if (deliveryFee > 0) {
    doc.text("Delivery", margin, y);
    doc.text(formatMoney(deliveryFee, inv.currency), pageWidth - margin, y, { align: "right" });
    y += 18;
  }

  y += 4;
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(1.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text("Total", margin, y);
  doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.text(formatMoney(totalVal, inv.currency), pageWidth - margin, y, { align: "right" });

  y += 34;

  // How to pay, with the real channel logos, on anything still owing.
  if (showHowToPay) {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y > pageHeight - 220) {
      doc.addPage();
      y = 60;
    }

    doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("How to pay", margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.text(
      `Quote invoice ${invNumber} as the reference so we can match your payment.`,
      margin,
      y + 13
    );
    y += 30;

    // Two columns so four channels fit without pushing onto another page.
    const colWidth = (pageWidth - margin * 2) / 2;
    const rowHeight = 54;
    const logoBox = 26;

    payChannels.forEach((c, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * colWidth;
      const rowY = y + row * rowHeight;

      const logo = channelLogos[i];
      let textX = x;

      if (logo && logo.dataUrl) {
        // Fit the logo inside a square box, keeping its aspect ratio.
        const ratio = logo.height / (logo.width || 1);
        const drawW = ratio > 1 ? logoBox / ratio : logoBox;
        const drawH = ratio > 1 ? logoBox : logoBox * ratio;
        doc.addImage(
          logo.dataUrl,
          "JPEG",
          x,
          rowY - 9 + (logoBox - drawH) / 2,
          drawW,
          drawH,
          undefined,
          "FAST"
        );
        textX = x + logoBox + 9;
      }

      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(c.label, textX, rowY);

      if (c.identifier) {
        doc.setFont("courier", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.text(c.identifier, textX, rowY + 13);
      }

      const sub = [c.account_name, c.extra].filter(Boolean).join(" | ");
      if (sub) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
        const lines = doc.splitTextToSize(sub, colWidth - (textX - x) - 12) as string[];
        doc.text(lines[0], textX, rowY + 25);
      }
    });

    y += Math.ceil(payChannels.length / 2) * rowHeight + 6;
  }

  if (qrDataUrl) {
    const qrSize = 74;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y > pageHeight - 130) {
      doc.addPage();
      y = 60;
    }
    doc.addImage(qrDataUrl, "PNG", margin, y, qrSize, qrSize, undefined, "FAST");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.text("Scan to verify this invoice", margin, y + qrSize + 11);
  }

  doc.setFontSize(7.5);
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.text(
    `Generated ${formatDateTime(new Date())}`,
    pageWidth - margin,
    doc.internal.pageSize.getHeight() - 30,
    { align: "right" }
  );

  return doc;
}

function InvoicesPage() {
  const { session } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  const { data: invoices, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-invoices", session?.user?.id],
    queryFn: () => fetchInvoices(session!.user.id),
    enabled: !!session?.user?.id,
  });

  // Payment channels are printed on unpaid invoices so the customer can pay.
  const { data: payChannels } = useQuery({
    queryKey: ["payment-channels"],
    queryFn: fetchPayChannels,
  });

  async function handleDownload(inv: InvoiceRow) {
    setBusyId(inv.id);
    setPdfError(null);
    try {
      const doc = await buildInvoicePdf(inv, payChannels ?? []);
      doc.save(`${inv.invoice_number ?? inv.order_number}.pdf`);
    } catch (err) {
      setPdfError(
        err instanceof Error
          ? `Could not build the PDF. ${err.message}`
          : "Could not build the PDF. Please try again."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleView(inv: InvoiceRow) {
    setBusyId(inv.id);
    setPdfError(null);
    try {
      const doc = await buildInvoicePdf(inv, payChannels ?? []);
      const url = doc.output("bloburl") as unknown as string;
      setPreview({ url, name: inv.invoice_number ?? inv.order_number });
    } catch (err) {
      setPdfError(
        err instanceof Error
          ? `Could not open the invoice. ${err.message}`
          : "Could not open the invoice. Please try again."
      );
    } finally {
      setBusyId(null);
    }
  }

  const list = invoices ?? [];
  const outstanding = list
    .filter((i) => displayStatus(i) !== "Paid")
    .reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const paidCount = list.filter((i) => displayStatus(i) === "Paid").length;
  const overdueCount = list.filter((i) => displayStatus(i) === "Overdue").length;
  const currency = list[0]?.currency ?? "KES";

  return (
    <div className="space-y-6">
      <header className="border-b border-brand-navy/10 pb-5">
        <h1 className="text-xl font-bold text-brand-navy">Invoices</h1>
        <p className="mt-1 text-sm text-brand-navy/55">
          View, download and keep track of what you owe.
        </p>
      </header>

      {list.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            icon={Clock}
            label="Outstanding"
            value={formatMoney(outstanding, currency)}
            accent={outstanding > 0}
          />
          <SummaryCard icon={CheckCircle2} label="Paid invoices" value={String(paidCount)} />
          <SummaryCard
            icon={AlertTriangle}
            label="Overdue"
            value={String(overdueCount)}
            accent={overdueCount > 0}
          />
        </div>
      )}

      {pdfError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-700">{pdfError}</p>
            <button
              type="button"
              onClick={() => setPdfError(null)}
              className="mt-1 text-xs font-bold text-red-600 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-brand-navy/50" />
          <p className="text-sm text-brand-navy/50">Loading your invoices...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto h-7 w-7 text-red-500" />
          <p className="mt-3 text-sm font-bold text-brand-navy">We could not load your invoices</p>
          <p className="mt-1 text-xs text-brand-navy/60">
            {error instanceof Error ? error.message : "Please try again shortly."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-5 rounded-md bg-brand-navy px-5 py-2.5 text-xs font-bold text-white transition hover:brightness-110"
          >
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-brand-navy/15 bg-white p-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-surface">
            <Receipt className="h-6 w-6 text-brand-navy/35" />
          </div>
          <h2 className="mt-5 text-base font-bold text-brand-navy">No invoices yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-brand-navy/55">
            Once you place an order, its invoice appears here for you to view and download at any
            time.
          </p>
          <a
            href="/shop"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            <ShoppingBag className="h-4 w-4" /> Browse the shop
          </a>
        </div>
      ) : (
        <>
          {/* Cards on small screens, table on larger */}
          <div className="space-y-3 md:hidden">
            {list.map((inv) => (
              <InvoiceCard
                key={inv.id}
                inv={inv}
                busy={busyId === inv.id}
                onView={() => handleView(inv)}
                onDownload={() => handleDownload(inv)}
              />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-brand-navy/12 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-navy/10 bg-brand-surface/50 text-left text-[11px] font-bold uppercase tracking-wider text-brand-navy/45">
                    <th className="whitespace-nowrap py-3.5 pl-5">Invoice</th>
                    <th className="whitespace-nowrap px-3">Issued</th>
                    <th className="whitespace-nowrap px-3">Description</th>
                    <th className="whitespace-nowrap px-3">Status</th>
                    <th className="whitespace-nowrap px-3 text-right">Amount</th>
                    <th className="whitespace-nowrap pr-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-navy/8">
                  {list.map((inv) => {
                    const status = displayStatus(inv);
                    const busy = busyId === inv.id;
                    return (
                      <tr key={inv.id} className="transition-colors hover:bg-brand-surface/40">
                        <td className="py-4 pl-5">
                          <div className="font-mono text-xs font-bold text-brand-navy">
                            {inv.invoice_number ?? inv.order_number}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-brand-navy/40">
                            {inv.order_number}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 text-xs text-brand-navy/65">
                          {formatDate(new Date(inv.created_at))}
                        </td>
                        <td className="px-3 text-xs text-brand-navy/65">{describeInvoice(inv)}</td>
                        <td className="px-3">
                          <StatusPill status={status} />
                        </td>
                        <td className="px-3 text-right text-sm font-bold tabular-nums text-brand-navy">
                          {formatMoney(inv.total, inv.currency)}
                        </td>
                        <td className="py-4 pr-5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleView(inv)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-md border border-brand-navy/15 px-2.5 py-1.5 text-xs font-semibold text-brand-navy transition-colors hover:border-brand-navy disabled:opacity-40"
                            >
                              {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(inv)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-2.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
                            >
                              <Download className="h-3.5 w-3.5" />
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* In-browser preview so nobody has to download just to look */}
      {preview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-brand-navy/50 p-4 backdrop-blur-sm"
          onClick={() => {
            URL.revokeObjectURL(preview.url);
            setPreview(null);
          }}
        >
          <div
            className="flex h-[88vh] w-full max-w-3xl flex-col overflow-hidden border-2 border-brand-navy bg-white shadow-[8px_8px_0_0_var(--color-brand-navy)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b-2 border-brand-navy px-5 py-3.5">
              <h2 className="font-mono text-sm font-bold text-brand-navy">{preview.name}</h2>
              <div className="flex items-center gap-2">
                <a
                  href={preview.url}
                  download={`${preview.name}.pdf`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(preview.url);
                    setPreview(null);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-md text-brand-navy/50 transition-colors hover:bg-brand-surface hover:text-brand-navy"
                  aria-label="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe src={preview.url} title={preview.name} className="flex-1 bg-brand-surface" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: InvoiceDisplayStatus }) {
  const cls =
    status === "Paid"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "Overdue"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cls}`}
    >
      {status}
    </span>
  );
}

function SummaryCard({
  icon: Icon, label, value, accent,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-brand-navy/12 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 ${accent ? "text-brand-orange" : "text-brand-navy/35"}`} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-navy/45">
          {label}
        </span>
      </div>
      <div
        className={`mt-1.5 text-xl font-bold tabular-nums ${accent ? "text-brand-orange" : "text-brand-navy"}`}
      >
        {value}
      </div>
    </div>
  );
}

function InvoiceCard({
  inv, busy, onView, onDownload,
}: {
  inv: InvoiceRow;
  busy: boolean;
  onView: () => void;
  onDownload: () => void;
}) {
  const status = displayStatus(inv);
  return (
    <div className="rounded-xl border border-brand-navy/12 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-xs font-bold text-brand-navy">
            {inv.invoice_number ?? inv.order_number}
          </div>
          <div className="mt-0.5 text-xs text-brand-navy/55">{describeInvoice(inv)}</div>
          <div className="mt-1 text-[11px] text-brand-navy/40">
            {formatDate(new Date(inv.created_at))}
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-brand-navy/8 pt-3">
        <span className="text-base font-bold tabular-nums text-brand-navy">
          {formatMoney(inv.total, inv.currency)}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onView}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-navy/15 px-2.5 py-1.5 text-xs font-semibold text-brand-navy disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            View
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>
    </div>
  );
}