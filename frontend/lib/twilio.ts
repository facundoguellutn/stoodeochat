import twilio from "twilio";

// Cliente Twilio para enviar mensajes
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

function getTwilioClient() {
  if (!accountSid || !authToken) {
    throw new Error("Faltan credenciales de Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)");
  }
  return twilio(accountSid, authToken);
}

/**
 * Envía un mensaje de WhatsApp usando Twilio
 * @param to Número de teléfono destino (formato: +5491112345678)
 * @param body Contenido del mensaje
 */
export async function sendWhatsAppMessage(to: string, body: string) {
  if (!whatsappNumber) {
    throw new Error("Falta TWILIO_WHATSAPP_NUMBER");
  }

  const client = getTwilioClient();

  return client.messages.create({
    from: `whatsapp:${whatsappNumber}`,
    to: `whatsapp:${to}`,
    body,
  });
}

/**
 * Crea una respuesta TwiML para Twilio
 * Esta es la forma más simple de responder a un webhook de Twilio
 * @param message Mensaje a enviar como respuesta
 */
export function createTwiMLResponse(message: string): string {
  const { MessagingResponse } = twilio.twiml;
  const twiml = new MessagingResponse();
  twiml.message(message);
  return twiml.toString();
}

/**
 * Valida la firma de un webhook de Twilio
 * @param signature Header X-Twilio-Signature
 * @param url URL completa del webhook
 * @param params Parámetros del request
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken) {
    console.warn("No se puede validar firma: falta TWILIO_AUTH_TOKEN");
    return false;
  }

  return twilio.validateRequest(authToken, signature, url, params);
}

/**
 * Extrae el número de teléfono del formato WhatsApp de Twilio
 * @param whatsappId Formato: whatsapp:+5491112345678
 * @returns Número limpio: +5491112345678
 */
export function extractPhoneNumber(whatsappId: string): string {
  return whatsappId.replace("whatsapp:", "");
}
