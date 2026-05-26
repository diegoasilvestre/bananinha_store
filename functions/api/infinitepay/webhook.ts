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

      // Fetch the full order details along with items for notification
      const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderNsu)
        .single();

      if (orderErr) {
        console.error('Webhook Fetch Order Error:', orderErr);
      } else if (order) {
        try {
          const origin = new URL(context.request.url).origin;
          const whatsappSecret = context.env.WHATSAPP_SECRET || '';
          
          await fetch(`${origin}/api/whatsapp/notify?secret=${encodeURIComponent(whatsappSecret)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-WhatsApp-Secret': whatsappSecret
            },
            body: JSON.stringify({
              event: 'order_paid',
              payload: { order }
            })
          });

          // Send Resend confirmation email (fire-and-forget, non-blocking)
          fetch(`${origin}/api/email/send-confirmation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order })
          }).catch((emailErr) => {
            console.error('Email notification trigger error:', emailErr);
          });
        } catch (notifyErr) {
          console.error('Webhook Notification Trigger Error:', notifyErr);
        }
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
