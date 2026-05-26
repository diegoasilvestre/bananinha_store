// Cloudflare Function: GET /sitemap.xml
// Dynamically generates sitemap from active products in Supabase.
// Uses anon key (public data only — no sensitive info exposed).

import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://bananinha-store.pages.dev';

const STATIC_ROUTES = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/products', changefreq: 'daily', priority: '0.9' },
  { loc: '/rastrear', changefreq: 'monthly', priority: '0.5' },
  { loc: '/faq', changefreq: 'monthly', priority: '0.5' },
  { loc: '/contato', changefreq: 'monthly', priority: '0.4' },
  { loc: '/politica-de-privacidade', changefreq: 'yearly', priority: '0.3' },
  { loc: '/termos-de-uso', changefreq: 'yearly', priority: '0.3' },
  { loc: '/politica-de-envio', changefreq: 'yearly', priority: '0.3' },
  { loc: '/trocas-e-devolucoes', changefreq: 'yearly', priority: '0.3' },
];

export async function onRequestGet(context: any) {
  const supabaseUrl = context.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = context.env.VITE_SUPABASE_ANON_KEY || '';

  let productEntries = '';

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: products } = await supabase
        .from('products')
        .select('slug, updated_at')
        .eq('active', true)
        .order('updated_at', { ascending: false });

      if (products) {
        productEntries = products
          .map((p: { slug: string; updated_at: string }) => {
            const lastmod = p.updated_at ? p.updated_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
            return `  <url>
    <loc>${SITE_URL}/product/${p.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
          })
          .join('\n');
      }
    } catch (err) {
      console.error('Sitemap product fetch error:', err);
    }
  }

  const staticEntries = STATIC_ROUTES.map(
    (r) => `  <url>
    <loc>${SITE_URL}${r.loc}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  ).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${productEntries}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
