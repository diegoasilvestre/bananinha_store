import { createClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
}

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request, env } = context;

  try {
    const body = (await request.json()) as any;
    const { productId, size } = body;

    if (!productId) {
      return new Response(JSON.stringify({ error: 'Missing productId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch product name
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('name')
      .eq('id', productId)
      .single();

    if (prodErr || !product) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Fetch pending alerts
    let alertQuery = supabase
      .from('price_alerts')
      .select('*')
      .eq('product_id', productId)
      .eq('notified', false);

    if (size) {
      alertQuery = alertQuery.eq('size', size);
    }

    const { data: alerts, error: alertErr } = await alertQuery;

    if (alertErr) throw alertErr;

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: 'No pending alerts found.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Send emails via Resend
    let sentCount = 0;
    const resendKey = env.RESEND_API_KEY;

    for (const alert of alerts) {
      const email = alert.email;
      const sizeLabel = alert.size ? `tamanho ${alert.size}` : 'qualquer tamanho';

      if (resendKey) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`
            },
            body: JSON.stringify({
              from: 'Bananinha Store <onboarding@resend.dev>',
              to: email,
              subject: `👕 O Manto que você queria voltou ao estoque!`,
              html: `<p>Olá!</p><p>Boas notícias: a camisa <strong>${product.name}</strong> no <strong>${sizeLabel}</strong> está de volta ao estoque da Bananinha Store!</p><p>Não perca tempo e garanta a sua agora mesmo no nosso site!</p>`
            })
          });
          if (res.ok) {
            sentCount++;
          }
        } catch (fetchErr) {
          console.error(`Error sending email to ${email}:`, fetchErr);
        }
      } else {
        // Log simulation if Resend key is missing
        console.log(`[Resend Email Simulation] To: ${email} | Subject: Back in stock! | Product: ${product.name} (${sizeLabel})`);
        sentCount++;
      }

      // Mark alert as notified
      await supabase
        .from('price_alerts')
        .update({ notified: true })
        .eq('id', alert.id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      count: sentCount, 
      message: `${sentCount} clientes notificados com sucesso.` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
