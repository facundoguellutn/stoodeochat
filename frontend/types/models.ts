import { Types } from "mongoose";

export interface ICompany {
  _id: Types.ObjectId;
  nombre: string;
  config: {
    llmModel: string;
    embeddingModel: string;
    maxTokensPerMonth: number;
  };
  estado: "activo" | "inactivo" | "suspendido";
  plan: "basico" | "profesional" | "enterprise";
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = "admin" | "gestor" | "usuario";

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  password: string;
  nombre: string;
  companyId?: Types.ObjectId;
  role: UserRole;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocument {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  nombre: string;
  activeVersionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentVersionEstado = "procesando" | "activo" | "error";

export interface IDocumentVersion {
  _id: Types.ObjectId;
  documentId: Types.ObjectId;
  companyId: Types.ObjectId;
  texto: string;
  estado: DocumentVersionEstado;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChunk {
  _id: Types.ObjectId;
  documentVersionId: Types.ObjectId;
  documentId: Types.ObjectId;
  companyId: Types.ObjectId;
  text: string;
  embedding: number[];
  embeddingModel: string;
  createdAt: Date;
}

export interface IConversation {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  titulo: string;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageRole = "user" | "assistant";

export interface IMessage {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  role: MessageRole;
  content: string;
  chunksUsed: Types.ObjectId[];
  tokenCount?: number;
  createdAt: Date;
}

export type UsageType = "embedding" | "chat_completion" | "other";

export type PaymentMethod = "transfer" | "card" | "cash" | "other";

export interface IPayment {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  amount: number;
  date: Date;
  description?: string;
  method?: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUsageLog {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  userId: Types.ObjectId;
  type: UsageType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
