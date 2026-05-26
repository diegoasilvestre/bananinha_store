import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { handleBotCommand } from './src/lib/botHandler'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables including those without VITE_ prefix
  const env = loadEnv(mode, process.cwd(), '');

  const supabaseUrl = env.VITE_SUPABASE_URL || '';
  const supabaseServiceRole = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const whatsappSecret = env.WHATSAPP_SECRET || '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'whatsapp-bot-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = new URL(req.url || '', `http://${req.headers.host}`);

            if (url.pathname.startsWith('/api/whatsapp/webhook') && req.method === 'POST') {
              const querySecret = url.searchParams.get('secret');
              const headerSecret = req.headers['x-whatsapp-secret'] as string;
              
              if (whatsappSecret && querySecret !== whatsappSecret && headerSecret !== whatsappSecret) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
              }

              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body);
                  let messageText = '';
                  let senderPhone = '';

                  if (payload.event === 'messages.upsert' && payload.data?.message) {
                    const data = payload.data;
                    messageText = data.message.conversation || data.message.extendedTextMessage?.text || '';
                    senderPhone = data.key?.remoteJid?.split('@')[0] || '';
                  } else if (payload.message || payload.text) {
                    messageText = payload.message || payload.text || '';
                    senderPhone = payload.sender || payload.phone || '';
                  }

                  if (!messageText) {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ status: 'ignored', reason: 'No message content' }));
                    return;
                  }

                  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);
                  const replyText = await handleBotCommand(messageText, senderPhone, supabaseAdmin);

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ reply: replyText }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
              return;
            }

            if (url.pathname.startsWith('/api/whatsapp/notify') && req.method === 'POST') {
              const querySecret = url.searchParams.get('secret');
              const headerSecret = req.headers['x-whatsapp-secret'] as string;

              if (whatsappSecret && querySecret !== whatsappSecret && headerSecret !== whatsappSecret) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
              }

              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(body);
                  const { event, payload } = parsed;

                  let messageText = '';
                  switch (event) {
                    case 'order_created': {
                      const { order } = payload;
                      messageText = `🛍️ *Novo Pedido Recebido!* \n\n• *ID:* \`${order.id.slice(0, 8)}\`\n• *Cliente:* ${order.customer_name}\n• *Total:* R$ ${Number(order.total_amount).toFixed(2)}\n• *Pagamento:* ${order.payment_method}`;
                      break;
                    }
                    case 'order_status_updated': {
                      const { order, oldStatus, newStatus } = payload;
                      messageText = `🔔 *Status do Pedido Atualizado!* \n\n• *ID:* \`${order.id.slice(0, 8)}\`\n• *Cliente:* ${order.customer_name}\n• *De:* ${oldStatus}\n• *Para:* *${newStatus}*`;
                      break;
                    }
                    case 'stock_out': {
                      const { product, size, sku } = payload;
                      messageText = `⚠️ *Alerta de Estoque Esgotado!* \n\n• *Produto:* ${product.name}\n• *SKU:* \`${sku}\`\n• *Tamanho:* ${size}`;
                      break;
                    }
                    case 'price_alert': {
                      const { product, size, email } = payload;
                      messageText = `🔔 *Novo Alerta de Cliente:* \n\n• *Produto:* ${product.name}\n• *Tamanho:* ${size || 'Todos'}\n• *E-mail:* ${email}`;
                      break;
                    }
                    default:
                      res.statusCode = 400;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: 'Invalid event' }));
                      return;
                  }

                  console.log(`[WhatsApp Bot Local Notification: ${event}] Message: ${messageText}`);

                  const notifyUrl = env.WHATSAPP_NOTIFICATION_URL || '';
                  let dispatched = false;
                  if (notifyUrl) {
                    try {
                      const resFetch = await fetch(notifyUrl, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'X-WhatsApp-Secret': whatsappSecret
                        },
                        body: JSON.stringify({
                          message: messageText,
                          event,
                          payload
                        })
                      });
                      dispatched = resFetch.ok;
                    } catch (fetchErr) {
                      console.error('Error forwarding to n8n:', fetchErr);
                    }
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, message: messageText, dispatched }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
              return;
            }

            if (url.pathname.startsWith('/api/alerts/notify') && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { productId, size } = JSON.parse(body);

                  if (!productId) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Missing productId' }));
                    return;
                  }

                  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

                  // 1. Fetch product name
                  const { data: product, error: prodErr } = await supabaseAdmin
                    .from('products')
                    .select('name')
                    .eq('id', productId)
                    .single();

                  if (prodErr || !product) {
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Product not found' }));
                    return;
                  }

                  // 2. Fetch pending alerts
                  let alertQuery = supabaseAdmin
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
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, count: 0, message: 'No pending alerts found.' }));
                    return;
                  }

                  // 3. Send emails via Resend
                  let sentCount = 0;
                  const resendKey = env.RESEND_API_KEY || '';

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
                      console.log(`[Resend Email Local Simulation] To: ${email} | Subject: Back in stock! | Product: ${product.name} (${sizeLabel})`);
                      sentCount++;
                    }

                    // Mark alert as notified
                    await supabaseAdmin
                      .from('price_alerts')
                      .update({ notified: true })
                      .eq('id', alert.id);
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ 
                    success: true, 
                    count: sentCount, 
                    message: `${sentCount} clientes notificados com sucesso.` 
                  }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
              return;
            }

            if (url.pathname.startsWith('/api/infinitepay/create-link') && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body);
                  const handle = env.INFINITEPAY_HANDLE || '';
                  if (!handle) {
                    throw new Error('INFINITEPAY_HANDLE não configurado no backend.');
                  }

                  // Payload structure based on InfinitePay documentation
                  const infinitePayPayload = {
                    handle: handle,
                    redirect_url: `${env.VITE_APP_URL}/order-success/${payload.order_nsu}`,
                    order_nsu: payload.order_nsu,
                    items: payload.items || [],
                    customer: payload.customer,
                  };

                  const response = await fetch('https://api.checkout.infinitepay.io/links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(infinitePayPayload)
                  });

                  const data = await response.json();
                  
                  if (!response.ok) {
                    console.error('InfinitePay API Error:', data);
                    res.statusCode = response.status;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Erro ao gerar link de pagamento na InfinitePay.', details: data }));
                    return;
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  // InfinitePay returns the generated url in 'url' field usually, but we pass the whole response.
                  res.end(JSON.stringify(data));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
              return;
            }

            if (url.pathname.startsWith('/api/infinitepay/webhook') && req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try {
                  const webhookSecret = env.INFINITEPAY_WEBHOOK_SECRET;
                  // InfinitePay doesn't standardize webhook signing yet, so we pass a secret in URL or use standard payload validation if they start supporting it. 
                  // For now we check a query parameter if configured.
                  const querySecret = url.searchParams.get('secret');
                  if (webhookSecret && querySecret !== webhookSecret) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Unauthorized' }));
                    return;
                  }

                  const payload = JSON.parse(body);
                  // Basic implementation: find order by order_nsu and mark as paid.
                  // Real world needs more robust transaction verification.
                  const orderNsu = payload.order_nsu || payload.order_id; 
                  const transactionId = payload.transaction_nsu || payload.id;
                  
                  if (orderNsu) {
                    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);
                    const { error } = await supabaseAdmin
                      .from('orders')
                      .update({ 
                        status: 'paid', 
                        payment_id: transactionId,
                        updated_at: new Date()
                      })
                      .eq('id', orderNsu);
                      
                    if (error) throw error;
                    
                    // We could also notify whatsapp here.
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ received: true }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
              return;
            }

            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})

