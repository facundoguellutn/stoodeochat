# Stoodeo Chat

Plataforma de chat con IA para empresas (multi-tenant). MVP: gestión de empresas/usuarios, roles, chat web, control de costos. Fase futura: bot de WhatsApp.

## Stack tecnológico

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui
- **Data fetching cliente**: React Query (`@tanstack/react-query` - pendiente instalar)
- **Backend**: Next.js API Routes + Server Actions (todo dentro de `frontend/`)
- **Base de datos**: MongoDB Atlas + Mongoose
- **Vector Search**: MongoDB Atlas Vector Search (para RAG)
- **Embeddings**: OpenAI text-embedding-3-small (1536 dims) / text-embedding-3-large (3072 dims)
- **LLM**: OpenAI (modelo configurable)
- **Auth**: JWT con jose (access token + refresh token)

## Estructura del proyecto

```
stoodeochat/
├── frontend/              # Aplicación Next.js (contiene todo)
│   ├── app/
│   │   ├── (auth)/        # Rutas públicas (login, register)
│   │   ├── (dashboard)/   # Rutas protegidas (admin, empresa)
│   │   ├── api/           # API Routes (endpoints REST, webhooks)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   └── ...            # Components por feature
│   ├── lib/
│   │   ├── db.ts          # Conexión Mongoose cacheada
│   │   ├── auth.ts        # Helpers de JWT (jose)
│   │   ├── session.ts     # Manejo de sesión
│   │   ├── openai.ts      # Cliente OpenAI
│   │   └── vectors.ts     # Utilidades de embeddings y vector search
│   ├── models/            # Mongoose schemas/models
│   ├── actions/           # Server Actions organizadas por dominio
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript types/interfaces
├── plans/                 # Documentación de planificación
└── CLAUDE.md
```

## Convenciones técnicas

### Conexión MongoDB (Mongoose)

Usar patrón de conexión cacheada en `global.mongoose` para evitar múltiples conexiones en dev hot reload y serverless.

### Auth (jose)

- Access token en cookie httpOnly (corta duración)
- Refresh token en cookie httpOnly separada (larga duración)
- Middleware de Next.js para verificación optimista de rutas protegidas
- Server Actions y API Routes validan sesión antes de ejecutar

### Server Actions vs API Routes

- **Server Actions**: mutaciones ligadas al UI (formularios, toggles, CRUD desde componentes)
- **API Routes**: endpoints genéricos, webhooks, integraciones externas, futuro WhatsApp

### React Query

- Toda llamada desde el cliente al backend usa React Query
- Server Components pueden fetch directo sin React Query

## Modelos de datos

- **Company**: nombre, config, estado, plan
- **User**: email, password (hash), companyId, role (admin | gestor | usuario)
- **Document**: companyId, nombre, contenido, versión activa
- **DocumentVersion**: documentId, companyId, texto, estado
- **Chunk**: documentVersionId, documentId, companyId, text, embedding[], embeddingModel
- **Conversation**: userId, companyId, mensajes, timestamps
- **Message**: conversationId, role (user|assistant), content, chunks usados

## Flujo RAG

1. **Ingesta**: Documento → split en chunks (300-800 chars) → OpenAI embeddings → almacenar en MongoDB con vector index
2. **Consulta**: Pregunta usuario → embedding de la pregunta → Vector Search (filtro companyId, top 3-5) → chunks como contexto → OpenAI chat completion → respuesta
3. **Aislamiento**: Toda búsqueda vectorial filtra por `companyId`

## Roles

- **Admin**: gestión global (empresas, usuarios, métricas)
- **Gestor**: gestión dentro de su empresa + chat
- **Usuario común**: solo chat

## Comandos

- `cd frontend && npm run lint` — verificar linting
- `cd frontend && npx tsc --noEmit` — verificar tipos TypeScript
