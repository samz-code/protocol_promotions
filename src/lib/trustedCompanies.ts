import { supabase } from "@/lib/supabase";

export type TrustedCompany = {
  id: string;
  name: string;
  image_url: string;
  type: "partner" | "trusted";
  href: string;
  is_active: boolean;
};

function isTrustedCompany(value: unknown): value is TrustedCompany {
  if (!value || typeof value !== "object") return false;
  const company = value as Partial<TrustedCompany>;
  return (
    typeof company.id === "string" &&
    typeof company.name === "string" &&
    typeof company.image_url === "string" &&
    (company.type === "partner" || company.type === "trusted") &&
    typeof company.href === "string" &&
    typeof company.is_active === "boolean"
  );
}

export async function fetchTrustedCompanies(): Promise<TrustedCompany[]> {
  const { data, error } = await supabase
    .from("trusted_companies")
    .select("id, name, image_url, type, href, is_active")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).filter(isTrustedCompany);
}

export async function saveTrustedCompanies(companies: TrustedCompany[]): Promise<void> {
  const { error } = await supabase.rpc("replace_trusted_companies", {
    p_companies: companies,
  });
  if (error) throw error;
}
