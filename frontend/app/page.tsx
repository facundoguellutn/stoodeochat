import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-xl font-bold">Stoodeo Chat</span>
          <Button asChild variant="outline">
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 px-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Chat con IA para tu empresa
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Potencia la productividad de tu equipo con un asistente inteligente
            que conoce los documentos de tu empresa.
          </p>
          <Button asChild size="lg">
            <Link href="/login">Comenzar</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
