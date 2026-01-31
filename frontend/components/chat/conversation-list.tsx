"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Plus, MessageSquare, Trash2, Loader2, ChevronsRight } from "lucide-react";

interface Conversation {
  _id: string;
  titulo: string;
  updatedAt: string;
}

interface ConversationListProps {
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}

async function fetchConversations(limit: number): Promise<{
  conversations: Conversation[];
  total: number;
}> {
  const res = await fetch(`/api/conversations?limit=${limit}`);
  if (!res.ok) throw new Error("Error al cargar conversaciones");
  return res.json();
}

async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar conversación");
}

export function ConversationList({
  selectedId,
  onSelect,
}: ConversationListProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch de las últimas 5 para el sidebar
  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetchConversations(5),
  });

  // Fetch de todas las conversaciones para el modal (solo cuando está abierto)
  const { data: allData, isLoading: isLoadingAll } = useQuery({
    queryKey: ["conversations", "all"],
    queryFn: () => fetchConversations(50),
    enabled: modalOpen,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (selectedId === deletedId) {
        onSelect(undefined);
      }
    },
  });

  const allConversations = allData?.conversations ?? [];
  const filteredConversations = searchQuery.trim()
    ? allConversations.filter((c) =>
        c.titulo.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allConversations;

  function handleNewConversation() {
    onSelect(undefined);
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (confirm("¿Eliminar esta conversación?")) {
      deleteMutation.mutate(id);
    }
  }

  function handleSelectFromModal(id: string) {
    onSelect(id);
    setModalOpen(false);
    setSearchQuery("");
  }

  return (
    <>
      <div className="flex h-full w-full flex-col border-r overflow-hidden">
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleNewConversation}
          >
            <Plus className="size-4" />
            Nueva conversación
          </Button>
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : data?.conversations.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No hay conversaciones
              </p>
            ) : (
              <>
                {data?.conversations.map((conv) => (
                  <div
                    key={conv._id}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors overflow-hidden",
                      selectedId === conv._id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => onSelect(conv._id)}
                  >
                    <MessageSquare className="size-4 shrink-0" />
                    <span className="flex-1 truncate min-w-0">{conv.titulo}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(e, conv._id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
                {(data?.total ?? 0) > 5 && (
                  <Button
                    variant="ghost"
                    className="w-full justify-center gap-2 text-muted-foreground text-xs mt-1"
                    onClick={() => setModalOpen(true)}
                  >
                    <ChevronsRight className="size-3" />
                    Ver más
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conversaciones</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Buscar conversación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <ScrollArea className="max-h-80">
            <div className="space-y-1">
              {isLoadingAll ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No se encontraron conversaciones
                </p>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv._id}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors overflow-hidden",
                      selectedId === conv._id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => handleSelectFromModal(conv._id)}
                  >
                    <MessageSquare className="size-4 shrink-0" />
                    <span className="flex-1 truncate min-w-0">{conv.titulo}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
