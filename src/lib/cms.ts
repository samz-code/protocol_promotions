import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type CmsBlock = {
  id: string;
  key: string;
  label: string | null;
  section: string | null;
  value: unknown;
  updated_at: string | null;
};

export async function fetchCmsBlocks(keys?: string[]): Promise<CmsBlock[]> {
  const query = supabase
    .from("content_blocks")
    .select("id, key, label, section, value, updated_at")
    .order("section")
    .order("key");

  if (keys?.length) {
    query.in("key", keys);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CmsBlock[];
}

export function useCmsBlocks(keys?: string[]) {
  return useQuery({
    queryKey: keys && keys.length ? ["cms", ...keys] : ["cms", "all"],
    queryFn: () => fetchCmsBlocks(keys),
  });
}

export function findCmsBlock(blocks: CmsBlock[] | undefined, key: string) {
  return blocks?.find((block) => block.key === key);
}

export function getCmsValue<T = unknown>(blocks: CmsBlock[] | undefined, key: string, fallback?: T): T | undefined {
  const block = findCmsBlock(blocks, key);
  if (!block) return fallback;
  return (block.value as T) ?? fallback;
}

export function getCmsString(blocks: CmsBlock[] | undefined, key: string, fallback = "") {
  const value = findCmsBlock(blocks, key)?.value;
  return typeof value === "string" ? value : fallback;
}

export function getCmsBoolean(blocks: CmsBlock[] | undefined, key: string, fallback = false) {
  const value = findCmsBlock(blocks, key)?.value;
  return typeof value === "boolean" ? value : fallback;
}
