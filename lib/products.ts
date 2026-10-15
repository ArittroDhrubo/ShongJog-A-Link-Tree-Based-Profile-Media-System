import { createClient } from "@/lib/supabase/server";

export type Product = "links" | "cv";

// Has this user activated a given product? Used to gate /cv/* behind an
// activation screen rather than a 404 — the product exists, they just
// haven't turned it on yet.
export async function hasProduct(
  userId: string,
  product: Product
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_products")
    .select("product")
    .eq("user_id", userId)
    .eq("product", product)
    .maybeSingle();
  return Boolean(data);
}

export async function getUserProducts(userId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_products")
    .select("product")
    .eq("user_id", userId);
  return (data ?? []).map((r) => r.product as Product);
}
