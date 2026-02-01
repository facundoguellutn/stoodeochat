"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteDocument } from "@/actions/documents/manage";

interface DocumentItem {
  _id: string;
  nombre: string;
  estado: string;
  createdAt: string;
}

interface DocumentsClientProps {
  initialDocuments: DocumentItem[];
}

const estadoBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  activo: { label: "Activo", variant: "default" },
  procesando: { label: "Procesando", variant: "secondary" },
  error: { label: "Error", variant: "destructive" },
  sin_version: { label: "Sin versión", variant: "outline" },
};

export function DocumentsClient({ initialDocuments }: DocumentsClientProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: documents = initialDocuments } = useQuery<DocumentItem[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("Error al cargar documentos");
      return res.json();
    },
    initialData: initialDocuments,
  });

  const uploadFile = useCallback(
    async (file: File) => {
      setUploadError("");
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          setUploadError(data.error ?? "Error al subir documento");
          return;
        }

        queryClient.invalidateQueries({ queryKey: ["documents"] });
      } catch {
        setUploadError("Error de conexión");
      } finally {
        setUploading(false);
      }
    },
    [queryClient]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  async function handleDelete(documentId: string) {
    setDeleting(documentId);
    try {
      await deleteDocument(documentId);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Error al eliminar"
      );
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-10 gap-4">
          <Upload className="size-10 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">
              Arrastra un archivo aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-muted-foreground">
              Formatos permitidos: .txt, .pdf, .docx, .md (max 10MB)
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Subiendo..." : "Seleccionar archivo"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.docx,.md"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>

      {uploadError && (
        <p className="text-sm text-destructive">{uploadError}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Documento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const badge = estadoBadge[doc.estado] ?? {
              label: doc.estado,
              variant: "outline" as const,
            };
            return (
              <TableRow key={doc._id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="font-medium">{doc.nombre}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </TableCell>
                <TableCell>
                  {new Date(doc.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(doc._id)}
                    disabled={deleting === doc._id}
                    title="Eliminar documento"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {documents.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                No hay documentos. Sube uno para comenzar.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
