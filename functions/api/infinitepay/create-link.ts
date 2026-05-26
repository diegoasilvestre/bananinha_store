export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const handle = context.env.INFINITEPAY_HANDLE || '';
    
    if (!handle) {
      return new Response(JSON.stringify({ error: 'INFINITEPAY_HANDLE não configurado.' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const payload = {
      handle: handle,
      redirect_url: `${context.env.VITE_APP_URL}/order-success/${body.order_nsu}`,
      order_nsu: body.order_nsu,
      items: body.items || [],
      customer: body.customer,
    };

    const response = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Erro na API InfinitePay', details: data }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(data), { 
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
