# Stoodeo Chat

## Descripción general

**Stoodeo Chat** es un proyecto cuyo objetivo es construir una plataforma de chat impulsada por inteligencia artificial, orientada a empresas, que permita responder consultas de usuarios utilizando información propia de cada organización.

En una **primera etapa**, el foco está puesto en construir la base del sistema:

* gestión de empresas y usuarios
* control de accesos y roles
* visualización y control de costos por empresa
* un chat web que permita probar el comportamiento del asistente

En etapas posteriores, el sistema evolucionará hacia un **bot de WhatsApp**, manteniendo la misma lógica de negocio y conocimiento, pero sumando el canal de mensajería como interfaz principal.

---

## Objetivo de la primera etapa (MVP)

El MVP busca validar el flujo completo del producto sin depender todavía de integraciones externas complejas.

En esta etapa, el sistema permitirá:

* administrar empresas desde un panel central
* crear y gestionar usuarios por empresa
* diferenciar roles y permisos
* probar el asistente mediante un chat web
* sentar las bases para control de costos y escalabilidad

La integración con WhatsApp está contemplada como **siguiente fase**, una vez validado el funcionamiento del core.

---

## Roles y permisos

### Admin

Usuarios con permisos globales sobre la plataforma.

Funciones principales:

* visualizar todas las empresas registradas
* crear, editar y desactivar empresas
* crear usuarios para cada empresa
* asignar roles a los usuarios
* visualizar métricas y costos por empresa (uso de IA, mensajes, etc.)

El rol Admin actúa como operador del sistema y no participa del uso cotidiano del chat como usuario final.

---

### Usuarios de empresa

Cada empresa tiene sus propios usuarios, que pueden tener distintos roles:

#### Gestor

Usuarios con permisos de gestión dentro de su empresa.

Funciones:

* acceder al chat
* consultar el asistente
* (en etapas posteriores) cargar y administrar documentación
* (futuro) visualizar métricas de uso de su empresa

#### Usuario común

Usuarios con acceso limitado.

Funciones:

* acceder únicamente al chat
* realizar consultas al asistente
* no tienen permisos de configuración ni administración

---

## Chat (fase actual)

En la primera instancia, el chat estará disponible como **chat web**, accesible desde la plataforma.

Este chat permitirá:

* escribir preguntas manualmente
* recibir respuestas del asistente
* validar la calidad de las respuestas
* testear el flujo de consultas antes de integrar WhatsApp

El chat web funciona como entorno de prueba y validación del sistema.

---

## Evolución futura: integración con WhatsApp

En una siguiente etapa, el chat se integrará con WhatsApp para funcionar como un bot.

Características esperadas:

* recepción de mensajes vía WhatsApp
* respuestas automáticas basadas en la información de la empresa
* reutilización del mismo backend y lógica del chat web
* identificación de empresa según el número o configuración del bot

Esta integración no forma parte del MVP inicial, pero el diseño del sistema está pensado para soportarla sin cambios estructurales.

---

## Tecnologías

### Frontend

* **Next.js** (App Router)
* **React**
* **React Query** para todas las llamadas al backend desde el cliente
* **shadcn/ui** para los componentes de interfaz
* Tailwind CSS para estilos

---

### Backend

* **Next.js** (API Routes y Server Actions)
* Uso de **Server Actions** cuando corresponde (mutaciones, lógica cercana al render)
* Uso de **API Routes** para endpoints más genéricos, integraciones externas y webhooks futuros

---

### Base de datos

* **MongoDB**
* **Mongoose** como ODM

La base de datos almacenará:

* usuarios
* empresas
* roles
* configuración del sistema
* (en etapas posteriores) documentos y embeddings

---

### Autenticación

Autenticación propia, sin frameworks externos como Clerk.

Características:

* JWT con **access token** y **refresh token**
* generación y verificación de tokens usando la librería **jose**
* manejo de sesiones desde el backend
* control de permisos por rol

---

## Enfoque de arquitectura

* Separación clara entre responsabilidades
* Preparado para multi-empresa (multi-tenant)
* Escalable en funcionalidades y canales (web → WhatsApp)
* Pensado para integrar IA y control de costos desde el inicio

---

## Estado actual

El proyecto se encuentra en etapa inicial, enfocado en:

* definición de arquitectura
* modelado de roles y permisos
* construcción del flujo base de administración y chat

Este documento sirve como referencia general del alcance y objetivos del proyecto en su primera fase.
