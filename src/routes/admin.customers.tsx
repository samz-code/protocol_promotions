import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Search, ArrowLeft, Plus, Trash2, Check, Loader2 } from "lucide-react";
import {
  AdminHeader, AdminLoading, AdminError, AdminEmpty, StatusBadge, ago, inputCls,
  AdminField, ConfirmDialog,
} from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({ meta: [{ title: "Customers | Admin" }] }),
  component: CustomersPage,
});

/* ------------------------------------------------------------------ types */

type Role = "customer" | "staff" | "admin";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  role: string;
  created_at: string;
};

/* --------------------------------------------------------------- queries */

async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, company, role, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

async function fetchProfile(id: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, company, role, created_at")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Profile;
}

/* ------------------------------------------------------------------- page */

function CustomersPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (creating) {
    return (
      <CreateCustomerForm
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setCreating(false);
          setOpenId(id);
        }}
      />
    );
  }

  if (openId) {
    return <CustomerDetailView customerId={openId} onClose={() => setOpenId(null)} />;
  }

  return <CustomerList onOpen={setOpenId} onCreate={() => setCreating(true)} />;
}

/* ------------------------------------------------------------------- list */

function CustomerList({ onOpen, onCreate }: { onOpen: (id: string) => void; onCreate: () => void }) {
  const query = useQuery({ queryKey: ["admin", "customers"], queryFn: fetchProfiles });
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const list = query.data ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.company ?? "").toLowerCase().includes(q)
    );
  }, [query.data, search]);

  if (query.isLoading) return <AdminLoading />;
  if (query.isError) return <AdminError message={(query.error as Error).message} />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <AdminHeader title="Customers" subtitle={`${(query.data ?? []).length} registered accounts.`} />
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 bg-brand-navy px-5 py-3 text-xs font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" />
          New customer
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, company"
          className={`${inputCls} pl-9`}
        />
      </div>

      {rows.length === 0 ? (
        <AdminEmpty text={search ? "No customers match your search." : "No customers yet."} />
      ) : (
        <div className="border-2 border-brand-navy overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-brand-navy text-white text-[11px] font-black uppercase tracking-widest">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 hidden md:table-cell">Company</th>
                <th className="px-4 py-3 hidden lg:table-cell">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 hidden md:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => onOpen(p.id)}
                  className="cursor-pointer border-b border-brand-navy/10 hover:bg-brand-surface transition-colors"
                >
                  <td className="px-4 py-3 font-bold text-brand-navy">{p.full_name ?? "—"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-brand-navy/70">{p.email}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-brand-navy/70">{p.company ?? "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-brand-navy/70">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={p.role} tone={p.role === "admin" || p.role === "staff" ? "solid" : "neutral"} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-brand-navy/50 text-xs">{ago(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- create form */

function CreateCustomerForm({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState<Role>("customer");

  const create = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error("The customer needs a name.");
      if (!email.trim()) throw new Error("The customer needs an email.");

      const { data, error: e } = await supabase
        .from("profiles")
        .insert({
          id: crypto.randomUUID(),
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          company: company.trim() || null,
          role,
        })
        .select("id")
        .single();

      if (e) throw e;
      return (data as { id: string }).id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["admin", "customers"] });
      onCreated(id);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="min-w-0 space-y-6">
      <header className="border-b-2 border-brand-navy pb-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/60 transition-colors hover:text-brand-orange"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All customers
        </button>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-navy">New customer</h1>
        <p className="mt-1.5 text-sm text-brand-navy/55">Add a customer record directly.</p>
      </header>

      {error && (
        <div className="max-w-lg border-2 border-brand-orange bg-brand-orange/8 p-4 text-sm font-semibold text-brand-navy">
          {error}
        </div>
      )}

      <section className="border-2 border-brand-navy/12 bg-white p-4 sm:p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <AdminField id="cust-name" label="Name" required>
            <input id="cust-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="Jane Wanjiku" />
          </AdminField>
          <AdminField id="cust-email" label="Email" required>
            <input id="cust-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="jane@company.co.ke" />
          </AdminField>
          <AdminField id="cust-phone" label="Phone">
            <input id="cust-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputCls} font-mono`} placeholder="0712 345 678" />
          </AdminField>
          <AdminField id="cust-company" label="Company">
            <input id="cust-company" value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} placeholder="Acme Ltd" />
          </AdminField>
          <AdminField id="cust-role" label="Role">
            <select id="cust-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputCls}>
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </AdminField>
        </div>
      </section>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="inline-flex items-center gap-2 bg-brand-navy px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110 disabled:opacity-50"
        >
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Create customer
        </button>
        <button
          type="button"
          onClick={onClose}
          className="border-2 border-brand-navy/20 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-brand-navy transition-colors hover:border-brand-navy"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- detail */

function CustomerDetailView({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "customer", customerId],
    queryFn: () => fetchProfile(customerId),
  });

  const [fullName, setFullName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const p = query.data;
  if (p && fullName === null && phone === null && company === null && role === null) {
    setFullName(p.full_name ?? "");
    setPhone(p.phone ?? "");
    setCompany(p.company ?? "");
    setRole(p.role as Role);
  }

  const save = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase
        .from("profiles")
        .update({
          full_name: (fullName ?? "").trim() || null,
          phone: (phone ?? "").trim() || null,
          company: (company ?? "").trim() || null,
          role: role ?? "customer",
        })
        .eq("id", customerId);
      if (e) throw e;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "customer", customerId] });
      qc.invalidateQueries({ queryKey: ["admin", "customers"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.from("profiles").delete().eq("id", customerId);
      if (e) throw e;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "customers"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  if (query.isLoading) return <AdminLoading />;
  if (query.isError || !p) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/60 hover:text-brand-orange"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All customers
        </button>
        <AdminError message={(query.error as Error)?.message ?? "Customer not found."} />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <header className="border-b-2 border-brand-navy pb-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-navy/60 transition-colors hover:text-brand-orange"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All customers
        </button>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy">{p.full_name ?? p.email}</h1>
            <p className="mt-1 text-sm text-brand-navy/55">
              {p.email} · Joined {ago(p.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="grid h-10 w-10 place-items-center border-2 border-brand-navy/20 text-brand-navy/50 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            title="Delete customer"
            aria-label="Delete customer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error && (
        <div className="max-w-lg border-2 border-brand-orange bg-brand-orange/8 p-4 text-sm font-semibold text-brand-navy">
          {error}
        </div>
      )}

      <section className="border-2 border-brand-navy/12 bg-white p-4 sm:p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <AdminField id="edit-name" label="Name">
            <input id="edit-name" value={fullName ?? ""} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </AdminField>
          <AdminField id="edit-email" label="Email" hint="Read only, tied to the account">
            <input id="edit-email" value={p.email} disabled className={`${inputCls} opacity-60`} />
          </AdminField>
          <AdminField id="edit-phone" label="Phone">
            <input id="edit-phone" value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} className={`${inputCls} font-mono`} />
          </AdminField>
          <AdminField id="edit-company" label="Company">
            <input id="edit-company" value={company ?? ""} onChange={(e) => setCompany(e.target.value)} className={inputCls} />
          </AdminField>
          <AdminField id="edit-role" label="Role">
            <select id="edit-role" value={role ?? "customer"} onChange={(e) => setRole(e.target.value as Role)} className={inputCls}>
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </AdminField>
        </div>

        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="mt-6 inline-flex items-center gap-2 bg-brand-navy px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_0_var(--color-brand-orange)] transition-all hover:brightness-110 disabled:opacity-50"
        >
          {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Save changes
        </button>
      </section>

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${p.full_name ?? p.email}?`}
          body="This permanently removes the customer record. This cannot be undone."
          confirmLabel="Delete customer"
          isPending={remove.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => remove.mutate()}
        />
      )}
    </div>
  );
}