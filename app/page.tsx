import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabaseClient";

async function addTestProduct() {
  "use server";
  if (supabase) {
    await supabase.from("products").insert({
      name: `Test Product ${Date.now()}`,
    });
  }
  revalidatePath("/");
}

export default async function Home() {
  const { data: products, error } = supabase
    ? await supabase
        .from("products")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
    : { data: null, error: { message: "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY." } };

  return (
    <main style={{ padding: "2rem", maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1rem" }}>Products</h1>

      <form action={addTestProduct} style={{ marginBottom: "1.5rem" }}>
        <button
          type="submit"
          style={{
            padding: "0.5rem 1rem",
            background: "#000",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Add Test Product
        </button>
      </form>

      {error && (
        <p style={{ color: "crimson", marginBottom: "1rem" }}>
          Error loading products: {error.message}
        </p>
      )}

      {products && products.length === 0 && !error && (
        <p style={{ color: "#666" }}>No products yet. Click the button above to add one.</p>
      )}

      {products && products.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {products.map((p) => (
            <li
              key={p.id}
              style={{
                padding: "0.75rem",
                border: "1px solid #eee",
                borderRadius: 4,
                marginBottom: "0.5rem",
              }}
            >
              <strong>{p.name}</strong>
              <br />
              <small style={{ color: "#666" }}>
                {new Date(p.created_at).toLocaleString()}
              </small>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
