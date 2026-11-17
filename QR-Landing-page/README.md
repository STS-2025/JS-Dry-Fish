# QR product price page

This is a small, read-only storefront page served by the main Vite app at:

`/QR-Landing-page/`

The production build includes it alongside the main storefront and admin page. Generate the shop QR code with the full public URL, for example `https://your-domain.example/QR-Landing-page/`.

It reads active rows from the existing Supabase `products` table. Vite uses the same root `.env` values as the main app: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is intended for browser use; the products table must allow public `SELECT` on active products through its Supabase RLS policy. Optional `VITE_SHOP_ADDRESS` and `VITE_SHOP_PHONE` values override the footer defaults.

Run it with the repository's normal Vite dev server, then open `http://localhost:3000/QR-Landing-page/`.
