import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Loader2, CheckCircle2, Lock } from "lucide-react";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({ 
    meta: [{ title: "Profile — Client Dashboard" }, { name: "robots", content: "noindex" }] 
  }),
  component: ProfilePage,
});

// Helper to determine password strength
const checkPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^A-Za-z0-9]/.test(password)) strength += 1;
  return strength;
};

function ProfilePage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setFullName(session.user.user_metadata?.full_name || "");
      setCompanyName(session.user.user_metadata?.company_name || "");
      setPhone(session.user.user_metadata?.phone || "");
      setLoading(false);
    }
  }, [session]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.auth.updateUser({
      data: { full_name: fullName, company_name: companyName, phone },
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSaving(true);
    await supabase.auth.updateUser({ password: newPassword });
    setNewPassword("");
    setPwSaving(false);
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 3000);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-navy" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-brand-navy/10 pb-4">
        <h1 className="text-xl font-bold text-brand-navy uppercase tracking-wider">Profile</h1>
        <p className="text-xs text-brand-navy/60 mt-0.5">Manage your account identity and security settings.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
        <form onSubmit={handleSaveProfile} className="rounded-xl border-2 border-brand-navy bg-white p-6 space-y-4 shadow-[4px_4px_0_0_rgba(10,37,64,1)]">
          <h2 className="text-xs font-black uppercase tracking-widest text-brand-navy">Account Details</h2>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-brand-navy/60">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border-2 border-brand-navy/20 p-2.5 text-sm font-bold focus:border-brand-navy focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-brand-navy/60">Company Name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full rounded-lg border-2 border-brand-navy/20 p-2.5 text-sm font-bold focus:border-brand-navy focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-brand-navy/60">Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border-2 border-brand-navy/20 p-2.5 text-sm font-bold focus:border-brand-navy focus:outline-none" />
          </div>
          <button disabled={saving} className="w-full rounded-lg bg-brand-navy text-white py-3 text-xs font-black uppercase tracking-wider hover:bg-brand-navy/90 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Changes"}
          </button>
          {saved && <p className="text-[10px] text-emerald-600 font-black uppercase text-center flex items-center justify-center gap-1"><CheckCircle2 className="h-3 w-3" /> Profile updated</p>}
        </form>

        <form onSubmit={handleChangePassword} className="rounded-xl border-2 border-brand-navy bg-white p-6 space-y-4 shadow-[4px_4px_0_0_rgba(10,37,64,1)]">
          <h2 className="text-xs font-black uppercase tracking-widest text-brand-navy flex items-center gap-2"><Lock className="h-3 w-3" /> Security</h2>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-brand-navy/60">New Password</label>
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border-2 border-brand-navy/20 p-2.5 text-sm font-bold focus:border-brand-navy focus:outline-none" placeholder="••••••••" />
            {newPassword.length > 0 && (
              <div className="flex gap-1 mt-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${i < checkPasswordStrength(newPassword) ? (checkPasswordStrength(newPassword) < 3 ? "bg-amber-500" : "bg-emerald-500") : "bg-brand-navy/10"}`} />
                ))}
              </div>
            )}
          </div>
          <button disabled={pwSaving || checkPasswordStrength(newPassword) < 3} className="w-full rounded-lg border-2 border-brand-navy text-brand-navy py-3 text-xs font-black uppercase tracking-wider hover:bg-brand-navy hover:text-white transition-colors disabled:opacity-50">
            {pwSaving ? "Updating..." : "Update Password"}
          </button>
          {pwSaved && <p className="text-[10px] text-emerald-600 font-black uppercase text-center flex items-center justify-center gap-1"><CheckCircle2 className="h-3 w-3" /> Securely updated</p>}
        </form>
      </div>
    </div>
  );
}