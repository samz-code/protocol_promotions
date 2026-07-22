import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Search } from "lucide-react";
import { AdminHeader, AdminLoading, AdminError, AdminEmpty, StatusBadge, ago, inputCls } from "@/lib/admin-ui";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({ meta: [{ title: "Customers | Admin" }] }),
  component: CustomersPage,
});

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  role: string;
  created_at: string;
};

async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, company, role, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

function CustomersPage() {
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
      <AdminHeader title="Customers" subtitle={`${(query.data ?? []).length} registered accounts.`} />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/40" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, company" className={`${inputCls} pl-9`} />
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
                <tr key={p.id} className="border-b border-brand-navy/10 hover:bg-brand-surface transition-colors">
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
