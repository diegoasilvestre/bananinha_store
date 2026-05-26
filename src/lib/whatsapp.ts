/**
 * Triggers a WhatsApp notification by calling the serverless notify endpoint.
 *
 * @param event The event type (e.g., 'order_created', 'order_status_updated', 'stock_out', 'price_alert')
 * @param payload The event payload containing details
 * @returns Promise<boolean> indicating success
 */
export async function triggerWhatsAppNotification(
  event: string,
  payload: Record<string, any>
): Promise<boolean> {
  try {
    const secret = import.meta.env.VITE_WHATSAPP_SECRET || '';
    const response = await fetch(`/api/whatsapp/notify?secret=${encodeURIComponent(secret)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WhatsApp-Secret': secret
      },
      body: JSON.stringify({
        event,
        payload
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('Fez requisição de notificação mas retornou erro:', errData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Falha ao disparar notificação de WhatsApp:', error);
    return false;
  }
}
