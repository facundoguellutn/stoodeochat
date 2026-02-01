import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import {
  ArrowRight,
  Bot,
  User,
  FileUp,
  Sparkles,
  SendHorizontal,
  Mic,
  Check,
  Shield,
  FileText,
  Users,
  BarChart3,
  Zap,
  Smartphone,
} from "lucide-react";
import { IconPdf, IconWord, IconGoogleDocs, IconTxt } from "@/components/icons";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            Stoodeo Chat
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Comenzar gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-24 md:py-32">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-[500px] w-[500px] rounded-full blur-3xl bg-muted/40" />
          </div>
          <div className="container mx-auto px-4 text-center relative">
            <Badge variant="outline" className="mb-6 inline-flex">
              <AnimatedShinyText className="text-sm">
                Potenciado por IA
              </AnimatedShinyText>
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl max-w-3xl mx-auto">
              Tu equipo merece respuestas instantáneas
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Subí los documentos de tu empresa y dejá que la IA responda las
              preguntas de tu equipo. Por chat web o WhatsApp.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/register">
                  Comenzar gratis
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#como-funciona">Ver cómo funciona</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Tres pasos */}
        <section id="como-funciona" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Tres pasos para empezar
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {/* Paso 1: Subí tus documentos */}
              <div className="flex flex-col">
                <div className="relative rounded-2xl border bg-card overflow-hidden p-6 h-[280px]">
                  <div className="absolute top-3 left-3 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    1
                  </div>
                  <div className="mt-6 space-y-4">
                    {/* Dropzone simulada */}
                    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 p-6">
                      <FileUp className="size-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Arrastrá tus archivos acá</p>
                    </div>
                    {/* Grid de formatos */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="flex flex-col items-center gap-1.5 rounded-lg bg-muted/50 p-2.5">
                        <IconPdf width={20} height={20} className="text-red-500" />
                        <span className="text-[11px] text-muted-foreground font-medium">PDF</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 rounded-lg bg-muted/50 p-2.5">
                        <IconWord width={20} height={20} />
                        <span className="text-[11px] text-muted-foreground font-medium">Word</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 rounded-lg bg-muted/50 p-2.5">
                        <IconGoogleDocs width={20} height={20} className="text-blue-500" />
                        <span className="text-[11px] text-muted-foreground font-medium">Docs</span>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 rounded-lg bg-muted/50 p-2.5">
                        <IconTxt width={20} height={20} className="text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground font-medium">TXT</span>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mt-4">Subí tus documentos</h3>
                <p className="text-muted-foreground mt-1">
                  Cargá manuales, guías, FAQs o cualquier documento.
                </p>
              </div>

              {/* Paso 2: La IA aprende */}
              <div className="flex flex-col">
                <div className="relative rounded-2xl border bg-card overflow-hidden p-6 h-[280px]">
                  <div className="absolute top-3 left-3 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    2
                  </div>
                  <div className="mt-6 space-y-4">
                    {/* Documento siendo procesado */}
                    <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                      <IconPdf width={18} height={18} className="shrink-0 text-red-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Manual de devoluciones.pdf</p>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
                          <div className="h-full w-3/4 rounded-full bg-primary" />
                        </div>
                      </div>
                    </div>
                    {/* Chunks extraídos */}
                    <div className="space-y-2">
                      {[
                        "El plazo de devolución es de 30 días...",
                        "Para iniciar una devolución, contactar...",
                        "Los productos deben estar sin uso y en...",
                      ].map((text) => (
                        <div key={text} className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2">
                          <Sparkles className="size-3.5 shrink-0 mt-0.5 text-primary" />
                          <p className="text-xs text-muted-foreground truncate">{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mt-4">La IA aprende</h3>
                <p className="text-muted-foreground mt-1">
                  Procesamos y organizamos la información al instante.
                </p>
              </div>

              {/* Paso 3: Tu equipo pregunta */}
              <div className="flex flex-col">
                <div className="relative rounded-2xl border bg-card overflow-hidden p-6 h-[280px]">
                  <div className="absolute top-3 left-3 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    3
                  </div>
                  <div className="mt-6 space-y-2">
                    {/* User message */}
                    <div className="flex gap-2 justify-end">
                      <div className="rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3 py-2 text-xs max-w-[80%]">
                        ¿Cuál es la política de devolución?
                      </div>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <User className="size-3" />
                      </div>
                    </div>
                    {/* Assistant message */}
                    <div className="flex gap-2">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Bot className="size-3" />
                      </div>
                      <div className="rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-xs max-w-[80%]">
                        Según nuestra política, tenés 30 días desde la compra para realizar una devolución. El producto debe estar sin uso y en su empaque original.
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mt-4">Tu equipo pregunta</h3>
                <p className="text-muted-foreground mt-1">
                  Por chat web o WhatsApp, respuestas precisas basadas en tus documentos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mockup Chat Web */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              {/* Texto */}
              <div className="space-y-6">
                <Badge variant="secondary">Chat Web</Badge>
                <h2 className="text-3xl font-bold">
                  Tu asistente, siempre disponible
                </h2>
                <p className="text-muted-foreground">
                  Un chat inteligente que conoce toda la documentación de tu
                  empresa y responde al instante.
                </p>
                <ul className="space-y-3">
                  {[
                    "Respuestas basadas en tus documentos",
                    "Historial de conversaciones",
                    "Funciona en celular y computadora",
                  ].map((text) => (
                    <li key={text} className="flex items-center gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3.5" />
                      </div>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mockup */}
              <div className="rounded-2xl border bg-background shadow-lg overflow-hidden">
                {/* Chat header */}
                <div className="flex items-center gap-3 border-b px-4 py-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                    <Bot className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Asistente Stoodeo</p>
                    <p className="text-xs text-muted-foreground">En línea</p>
                  </div>
                </div>
                {/* Messages */}
                <div className="space-y-1 p-4 bg-muted/20 min-h-[320px]">
                  {/* Assistant message */}
                  <div className="flex gap-3 px-4 py-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Bot className="size-4" />
                    </div>
                    <div className="flex max-w-[80%] flex-col gap-1 items-start">
                      <div className="rounded-2xl px-4 py-2 text-sm bg-muted rounded-bl-md">
                        ¡Hola! Soy el asistente de tu empresa. ¿En qué puedo
                        ayudarte?
                      </div>
                    </div>
                  </div>
                  {/* User message */}
                  <div className="flex gap-3 px-4 py-3 flex-row-reverse">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <User className="size-4" />
                    </div>
                    <div className="flex max-w-[80%] flex-col gap-1 items-end">
                      <div className="rounded-2xl px-4 py-2 text-sm bg-primary text-primary-foreground rounded-br-md">
                        ¿Cuál es la política de devolución?
                      </div>
                    </div>
                  </div>
                  {/* Assistant message */}
                  <div className="flex gap-3 px-4 py-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Bot className="size-4" />
                    </div>
                    <div className="flex max-w-[80%] flex-col gap-1 items-start">
                      <div className="rounded-2xl px-4 py-2 text-sm bg-muted rounded-bl-md">
                        Según nuestra política, tenés 30 días desde la compra
                        para realizar una devolución. El producto debe estar sin
                        uso y en su empaque original.
                      </div>
                    </div>
                  </div>
                </div>
                {/* Input bar */}
                <div className="flex items-center gap-2 border-t px-4 py-3">
                  <div className="flex-1 rounded-full border bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
                    Escribí tu mensaje...
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <SendHorizontal className="size-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mockup WhatsApp */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              {/* Mockup */}
              <div className="rounded-2xl overflow-hidden shadow-lg border">
                {/* WhatsApp header */}
                <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: "#075E54" }}>
                  <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
                    <Bot className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Asistente Empresa</p>
                    <p className="text-xs text-white/70">en línea</p>
                  </div>
                </div>
                {/* Messages */}
                <div
                  className="space-y-2 p-4 min-h-[320px] dark:bg-[#0B141A]"
                  style={{ backgroundColor: "var(--wa-bg, #ECE5DD)" }}
                >
                  <style>{`
                    :root { --wa-bg: #ECE5DD; }
                    .dark { --wa-bg: #0B141A; }
                  `}</style>
                  {/* Incoming */}
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1F2C34] shadow-sm">
                      <p className="text-gray-900 dark:text-gray-100">
                        ¡Hola! Bienvenido al asistente de Empresa. ¿En qué
                        puedo ayudarte?
                      </p>
                      <p className="text-[11px] text-gray-500 text-right mt-1">
                        10:30
                      </p>
                    </div>
                  </div>
                  {/* Outgoing */}
                  <div className="flex justify-end">
                    <div
                      className="max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm dark:bg-[#005C4B]"
                      style={{ backgroundColor: "#D9FDD3" }}
                    >
                      <p className="text-gray-900 dark:text-gray-100">
                        ¿Cuál es el horario de atención?
                      </p>
                      <p className="text-[11px] text-gray-500 text-right mt-1">
                        10:31
                      </p>
                    </div>
                  </div>
                  {/* Incoming */}
                  <div className="flex justify-start">
                    <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-white dark:bg-[#1F2C34] shadow-sm">
                      <p className="text-gray-900 dark:text-gray-100">
                        Nuestro horario de atención es de lunes a viernes de
                        9:00 a 18:00 hs, y sábados de 9:00 a 13:00 hs.
                      </p>
                      <p className="text-[11px] text-gray-500 text-right mt-1">
                        10:31
                      </p>
                    </div>
                  </div>
                </div>
                {/* Input bar */}
                <div
                  className="flex items-center gap-2 px-3 py-2 dark:bg-[#1F2C34]"
                  style={{ backgroundColor: "#F0F0F0" }}
                >
                  <div className="flex-1 rounded-full bg-white dark:bg-[#2A3942] px-4 py-2 text-sm text-gray-500">
                    Mensaje
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-full" style={{ backgroundColor: "#075E54" }}>
                    <Mic className="size-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Texto */}
              <div className="space-y-6">
                <Badge variant="secondary">WhatsApp</Badge>
                <h2 className="text-3xl font-bold">
                  Tu empresa en WhatsApp
                </h2>
                <p className="text-muted-foreground">
                  El mismo asistente inteligente, en la app que tu equipo ya
                  usa todos los días.
                </p>
                <ul className="space-y-3">
                  {[
                    "Disponible 24/7",
                    "El mismo conocimiento que el chat web",
                    "Ideal para equipos en movimiento",
                  ].map((text) => (
                    <li key={text} className="flex items-center gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3.5" />
                      </div>
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Todo lo que necesitás
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: "Multi-tenant seguro",
                  description:
                    "Cada empresa tiene sus datos completamente aislados y protegidos.",
                },
                {
                  icon: FileText,
                  title: "Múltiples formatos",
                  description:
                    "Cargá PDFs, documentos de texto, guías y más para entrenar al asistente.",
                },
                {
                  icon: Users,
                  title: "Roles y permisos",
                  description:
                    "Administradores, gestores y usuarios con accesos diferenciados.",
                },
                {
                  icon: BarChart3,
                  title: "Control de costos",
                  description:
                    "Monitoreá el uso de tokens y controlá los gastos de cada empresa.",
                },
                {
                  icon: Zap,
                  title: "Respuestas instantáneas",
                  description:
                    "La IA encuentra la información relevante en segundos.",
                },
                {
                  icon: Smartphone,
                  title: "Multiplataforma",
                  description:
                    "Chat web responsive y WhatsApp, accesible desde cualquier dispositivo.",
                },
              ].map(({ icon: Icon, title, description }) => (
                <Card key={title}>
                  <CardContent className="pt-6">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                      <Icon className="size-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              ¿Listo para empezar?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Creá tu cuenta gratis y empezá a responder las preguntas de tu
              equipo con IA.
            </p>
            <Button asChild size="lg">
              <Link href="/register">
                Comenzar gratis
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 Stoodeo Chat
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer">
              Términos
            </span>
            <span className="hover:text-foreground cursor-pointer">
              Privacidad
            </span>
            <span className="hover:text-foreground cursor-pointer">
              Contacto
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
