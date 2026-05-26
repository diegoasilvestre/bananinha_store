// Cloudflare Function: POST /api/email/send-confirmation
// Called from webhook.ts after payment is confirmed.
// Sends order confirmation email via Resend API.

interface OrderItem {
  product_name: string;
  size: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  shipping_method: string;
  address_street: string;
  address_number: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  order_items?: OrderItem[];
}

function buildEmailHTML(order: Order): string {
  const items = order.order_items || [];
  const itemsHTML = items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:13px;">${item.product_name} — Tam. ${item.size}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${item.quantity}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;">R$ ${Number(item.total_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
    </tr>`
    )
    .join('');

  const shortId = order.id.split('-')[0].toUpperCase();
  const trackUrl = `https://bananinha-store.pages.dev/rastrear`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Pedido Confirmado</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:#0f2c1a;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#d4a853;font-size:28px;letter-spacing:4px;font-weight:900;">BANANINHA STORE</h1>
            <p style="margin:8px 0 0;color:#a3c7a0;font-size:12px;letter-spacing:2px;">PEDIDO CONFIRMADO</p>
          </td>
        </tr>

        <!-- Hero message -->
        <tr>
          <td style="padding:32px 32px 24px;text-align:center;">
            <div style="background:#f0f7f2;border-radius:8px;padding:20px;">
              <p style="margin:0;font-size:14px;color:#1a5c3a;font-weight:700;text-transform:uppercase;letter-spacing:1px;">✅ Pagamento Confirmado!</p>
              <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Olá, <strong>${order.customer_name}</strong>! Seu pedido foi recebido e está sendo preparado.</p>
              <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;">Código do pedido: <strong style="font-family:monospace;color:#1a5c3a;">#${shortId}</strong></p>
            </div>
          </td>
        </tr>

        <!-- Items table -->
        <tr>
          <td style="padding:0 32px 24px;">
            <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#111;margin:0 0 12px;">Itens do Pedido</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="padding:8px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Produto</th>
                  <th style="padding:8px;text-align:center;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Qtd</th>
                  <th style="padding:8px;text-align:right;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
                <tr>
                  <td colspan="2" style="padding:12px 8px;font-size:12px;color:#6b7280;">Subtotal</td>
                  <td style="padding:12px 8px;text-align:right;font-size:12px;color:#6b7280;">R$ ${Number(order.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
                ${order.discount_amount > 0 ? `<tr><td colspan="2" style="padding:4px 8px;font-size:12px;color:#dc2626;">Desconto</td><td style="padding:4px 8px;text-align:right;font-size:12px;color:#dc2626;">- R$ ${Number(order.discount_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>` : ''}
                <tr>
                  <td colspan="2" style="padding:4px 8px;font-size:12px;color:#6b7280;">Frete (${order.shipping_method})</td>
                  <td style="padding:4px 8px;text-align:right;font-size:12px;color:#6b7280;">${order.shipping_amount === 0 ? 'Grátis' : `R$ ${Number(order.shipping_amount).toFixed(2)}`}</td>
                </tr>
                <tr style="border-top:2px solid #f3f4f6;">
                  <td colspan="2" style="padding:12px 8px;font-size:15px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:1px;">TOTAL PAGO</td>
                  <td style="padding:12px 8px;text-align:right;font-size:18px;font-weight:900;color:#d4a853;">R$ ${Number(order.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

        <!-- Delivery Address -->
        <tr>
          <td style="padding:0 32px 24px;">
            <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#111;margin:0 0 12px;">Endereço de Entrega</h2>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-size:12px;color:#4b5563;line-height:1.7;">
              ${order.address_street}, ${order.address_number}${order.address_complement ? ` — ${order.address_complement}` : ''}<br>
              ${order.address_neighborhood ? `${order.address_neighborhood}<br>` : ''}
              ${order.address_city} — ${order.address_state}, CEP: ${order.address_zip}
            </div>
          </td>
        </tr>

        <!-- Tracking CTA -->
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <a href="${trackUrl}" style="display:inline-block;background:#1a5c3a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
              RASTREAR MEU PEDIDO
            </a>
            <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">Dúvidas? Fale conosco pelo WhatsApp.</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:10px;color:#9ca3af;">Este e-mail foi enviado automaticamente pela Bananinha Store. Não responda a este e-mail.</p>
            <p style="margin:6px 0 0;font-size:10px;color:#9ca3af;">© 2026 Bananinha Store. Todos os direitos reservados.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function onRequestPost(context: any) {
  try {
    const resendKey = context.env.RESEND_API_KEY || '';

    if (!resendKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await context.request.json();
    const { order }: { order: Order } = body;

    if (!order?.customer_email) {
      return new Response(JSON.stringify({ error: 'Missing order or customer_email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const shortId = order.id.split('-')[0].toUpperCase();

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Bananinha Store <noreply@bananinha-store.pages.dev>',
        to: [order.customer_email],
        subject: `✅ Pedido #${shortId} Confirmado — Bananinha Store`,
        html: buildEmailHTML(order)
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Resend API error:', err);
      return new Response(JSON.stringify({ error: 'Failed to send email', detail: err }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();
    return new Response(JSON.stringify({ success: true, id: result.id }), {
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
