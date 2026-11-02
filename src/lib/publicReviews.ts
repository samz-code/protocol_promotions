import { supabase } from "@/lib/supabase";

export type PublicReview = {
  id: string;
  author_name: string;
  author_role: string | null;
  rating: number;
  body: string;
  created_at: string;
  is_verified: boolean;
};

export async function fetchApprovedReviews(): Promise<PublicReview[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, author_name, author_role, rating, body, created_at, is_verified")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data ?? []) as PublicReview[];
}
