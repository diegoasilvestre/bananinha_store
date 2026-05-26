import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context: any) {
  try {
    const webhookSecret = context.env.INFINITEPAY_WEBHOOK_SECRET;
    const url = new URL(context.request.url);
    const querySecret = url.searchParams.get('secret');

    if (webhookSecret && querySecret !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await context.request.json();
    const orderNsu = body.order_nsu || body.order_id;
    const transactionId = body.transaction_nsu || body.id;

    if (orderNsu) {
      const supabaseUrl = context.env.VITE_SUPABASE_URL || '';
      const supabaseServiceRole = context.env.SUPABASE_SERVICE_ROLE_KEY || '';
      
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);
      const { error } = await supabaseAdmin
        .from('orders')
        .update({ 
          status: 'paid', 
          payment_id: transactionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderNsu);

      if (error) {
        console.error('Webhook DB Error:', error);
        throw new Error('Falha ao atualizar o banco de dados');
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
