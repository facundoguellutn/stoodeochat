import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { createTwiMLResponse, extractPhoneNumber, formatForWhatsApp } from "@/lib/twilio";
import { generateSimpleResponse } from "@/lib/chat-service";
import { logWhatsAppUsage } from "@/lib/costs";

// Twilio envía los datos como application/x-www-form-urlencoded
export async function POST(req: NextRequest) {
  try {
    console.log("Webhook WhatsApp recibido");
    console.log(req);
    const formData = await req.formData();

    // Extraer datos del mensaje de Twilio
    const from = formData.get("From") as string; // whatsapp:+5491112345678
    const body = formData.get("Body") as string; // Mensaje del usuario
    const messageSid = formData.get("MessageSid") as string;

    if (!from || !body) {
      console.error("Webhook WhatsApp: faltan datos", { from, body });
      return new Response(
        createTwiMLResponse("Error: mensaje inválido"),
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Extraer número de teléfono limpio
    const phoneNumber = extractPhoneNumber(from);

    console.log(`WhatsApp mensaje recibido de ${phoneNumber}: ${body.substring(0, 50)}...`);

    await connectDB();

    // Buscar usuario por teléfono
    const user = await User.findOne({ telefono: phoneNumber }).lean();

    if (!user) {
      console.log(`Usuario no encontrado para teléfono: ${phoneNumber}`);
      return new Response(
        createTwiMLResponse(
          "Lo siento, tu número no está registrado en el sistema. " +
          "Por favor, contacta al administrador para registrarte."
        ),
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    if (!user.activo) {
      return new Response(
        createTwiMLResponse(
          "Tu cuenta está desactivada. Contacta al administrador."
        ),
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    if (!user.companyId) {
      return new Response(
        createTwiMLResponse(
          "Tu cuenta no tiene una empresa asignada. Contacta al administrador."
        ),
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Generar respuesta usando RAG
    const response = await generateSimpleResponse(
      body,
      user.companyId.toString(),
      user._id.toString()
    );

    // Loguear costos de WhatsApp (inbound + outbound)
    const usageParams = {
      companyId: user.companyId.toString(),
      userId: user._id.toString(),
      messageSid,
    };
    await Promise.all([
      logWhatsAppUsage({ ...usageParams, direction: "inbound" as const }),
      logWhatsAppUsage({ ...usageParams, direction: "outbound" as const }),
    ]);

    // Convertir markdown a formato WhatsApp y truncar si es necesario
    const formattedResponse = formatForWhatsApp(response);
    const truncatedResponse = formattedResponse.length > 1500
      ? formattedResponse.substring(0, 1500) + "..."
      : formattedResponse;

    console.log(`WhatsApp respuesta enviada a ${phoneNumber} (${truncatedResponse.length} chars)`);

    return new Response(
      createTwiMLResponse(truncatedResponse),
      { headers: { "Content-Type": "text/xml" } }
    );

  } catch (error) {
    console.error("Error en webhook WhatsApp:", error);
    
    return new Response(
      createTwiMLResponse(
        "Lo siento, ocurrió un error al procesar tu mensaje. " +
        "Por favor, intenta de nuevo más tarde."
      ),
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}

// Twilio puede enviar GET para verificar el webhook (opcional)
export async function GET() {
  return new Response("WhatsApp webhook activo", { status: 200 });
}
