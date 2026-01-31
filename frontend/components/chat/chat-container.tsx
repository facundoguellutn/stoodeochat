"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ConversationList } from "./conversation-list";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { History, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatContainer() {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | undefined
  >();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Flag para evitar recargar mensajes durante el streaming de una nueva conversación
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [conversationsSheetOpen, setConversationsSheetOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cargar mensajes cuando se selecciona una conversación existente
  useEffect(() => {
    async function loadConversation() {
      // No recargar si estamos en medio de crear una nueva conversación
      if (isNewConversation) return;

      if (selectedConversationId) {
        try {
          const res = await fetch(
            `/api/conversations/${selectedConversationId}`
          );
          if (res.ok) {
            const data = await res.json();
            // Convertir mensajes de la DB al formato local
            const loadedMessages = data.messages.map(
              (m: { _id: string; role: string; content: string }) => ({
                id: m._id,
                role: m.role as "user" | "assistant",
                content: m.content,
              })
            );
            setMessages(loadedMessages);
          }
        } catch (error) {
          console.error("Error cargando conversación:", error);
        }
      } else {
        // Nueva conversación: limpiar mensajes
        setMessages([]);
      }
    }

    loadConversation();
  }, [selectedConversationId, isNewConversation]);

  // Enviar mensaje con streaming
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    // Marcar si es una nueva conversación para evitar que el useEffect recargue
    const creatingNewConversation = !selectedConversationId;
    if (creatingNewConversation) {
      setIsNewConversation(true);
    }

    // Agregar mensaje del usuario inmediatamente
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Crear placeholder para la respuesta del asistente
    const assistantMessageId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          conversationId: selectedConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      // Capturar ID de conversación si es nueva
      const newConversationId = response.headers.get("X-Conversation-Id");
      if (newConversationId && !selectedConversationId) {
        setSelectedConversationId(newConversationId);
      }

      // Leer stream de respuesta
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        }
      }

      // Refrescar lista de conversaciones
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      // Remover mensaje del asistente si hubo error
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
      // Resetear flag de nueva conversación
      if (creatingNewConversation) {
        setIsNewConversation(false);
      }
    }
  }

  // Handler para seleccionar conversación y cerrar sheet en móvil
  function handleSelectConversation(id: string | undefined) {
    setSelectedConversationId(id);
    setConversationsSheetOpen(false);
  }

  return (
    <div className="flex h-full">
      {/* Sidebar de conversaciones - oculta en móvil */}
      <div className="hidden md:block w-64 shrink-0 h-full overflow-hidden">
        <ConversationList
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
        />
      </div>

      {/* Area de chat */}
      <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
        <div className="border-b px-4 md:px-6 py-4 shrink-0 flex items-center gap-3">
          {/* Botón para abrir conversaciones en móvil */}
          <Sheet open={conversationsSheetOpen} onOpenChange={setConversationsSheetOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <History className="size-5" />
                <span className="sr-only">Ver conversaciones</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="h-14 flex items-center px-4 border-b">
                <SheetTitle>Conversaciones</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-3.5rem)]">
                <ConversationList
                  selectedId={selectedConversationId}
                  onSelect={handleSelectConversation}
                />
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">Chat</h1>
        </div>

        {/* Mensajes */}
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="size-12 mx-auto mb-4 opacity-50" />
              <p>Inicia una conversación para comenzar</p>
              <p className="text-sm mt-1">
                Escribe tu pregunta y presiona Enter
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="py-4 max-w-3xl mx-auto px-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  role={message.role as "user" | "assistant"}
                  content={message.content}
                  isStreaming={
                    isLoading &&
                    index === messages.length - 1 &&
                    message.role === "assistant"
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        {/* Input */}
        <div className="border-t p-4 shrink-0">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
