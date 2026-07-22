import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Plus, Pencil, Loader2, AlertCircle, X, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/addresses")({
  head: () => ({ 
    meta: [{ title: "Addresses — Client Dashboard" }, { name: "robots", content: "noindex" }] 
  }),
  component: AddressesPage,
});

type AddressRow = {
  id: string;
  label: string;
  tag: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
};

async function fetchAddresses(userId: string): Promise<AddressRow[]> {
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, tag, address_line_1, address_line_2, city")
    .eq("user_id", userId);
    
  if (error) throw new Error(error.message);
  return data ?? [];
}

function AddressesPage() {
  const { session } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: addresses, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-addresses", session?.user?.id],
    queryFn: () => fetchAddresses(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccess(true);
    setIsSubmitting(false);
    setTimeout(() => { setIsModalOpen(false); setSuccess(false); refetch(); }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      <div className="flex items-center justify-between border-b border-brand-navy/10 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-brand-navy uppercase tracking-wider">Saved Addresses</h1>
          <p className="text-xs text-brand-navy/60 mt-0.5">Manage billing and delivery deployment destinations.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-navy" />
        </div>
      ) : error ? (
        <div className="p-8 text-center rounded-xl border-2 border-red-200 bg-red-50 text-red-700">
          <AlertCircle className="mx-auto mb-2 h-8 w-8"/> 
          <p className="font-bold">Failed to load addresses.</p>
          <p className="text-xs mt-1">{error instanceof Error ? error.message : "Please check your connection."}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {addresses?.map((a) => (
            <div key={a.id} className="rounded-xl border-2 border-brand-navy bg-white p-6 shadow-[4px_4px_0_0_rgba(10,37,64,1)]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-brand-navy font-black uppercase text-xs tracking-widest">
                  <MapPin className="h-4 w-4" /> {a.label}
                </div>
                <button className="text-brand-navy/40 hover:text-brand-navy transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <span className="inline-block mt-3 rounded-md bg-brand-surface border border-brand-navy/10 text-brand-navy px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                {a.tag}
              </span>
              <div className="mt-4 text-sm text-brand-navy/70 space-y-0.5 font-medium">
                <div>{a.address_line_1}</div>
                {a.address_line_2 && <div>{a.address_line_2}</div>}
                <div>{a.city}</div>
              </div>
            </div>
          ))}

          <button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl border-2 border-dashed border-brand-navy/20 p-6 flex flex-col items-center justify-center gap-3 text-brand-navy/60 hover:border-brand-navy hover:text-brand-navy transition-all min-h-50"
          >
            <Plus className="h-8 w-8" />
            <span className="text-xs font-black uppercase tracking-widest">Add new address</span>
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-xl border-2 border-brand-navy shadow-[6px_6px_0_0_rgba(10,37,64,1)] w-full max-w-sm">
            {success ? (
              <div className="text-center py-6"><CheckCircle2 className="mx-auto text-emerald-500 h-10 w-10 mb-3" /> Address Added!</div>
            ) : (
              <form onSubmit={handleAddAddress} className="space-y-4">
                <h3 className="font-black uppercase tracking-wider text-brand-navy">New Address</h3>
                <input required placeholder="Label (e.g. Home)" className="w-full border-2 border-brand-navy/20 p-2 text-sm rounded-lg" />
                <input required placeholder="Street Address" className="w-full border-2 border-brand-navy/20 p-2 text-sm rounded-lg" />
                <input required placeholder="City" className="w-full border-2 border-brand-navy/20 p-2 text-sm rounded-lg" />
                <button disabled={isSubmitting} className="w-full bg-brand-navy text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-wider">
                  {isSubmitting ? "Saving..." : "Save Address"}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-brand-navy/50 text-xs font-black uppercase">Cancel</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}