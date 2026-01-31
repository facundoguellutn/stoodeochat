# Stoodeo Chat – Arquitectura Técnica de IA

## Introducción

Este documento describe los aspectos técnicos relacionados con el uso de **inteligencia artificial**, específicamente la arquitectura basada en **RAG (Retrieval Augmented Generation)**, el manejo de **documentos**, **chunks**, **embeddings** y **búsqueda vectorial** dentro de Stoodeo Chat.

El objetivo es detallar cómo el sistema procesa el conocimiento de cada empresa y cómo lo utiliza para generar respuestas precisas, controladas y escalables.

---

## Concepto general: RAG (Retrieval Augmented Generation)

Stoodeo Chat utiliza una arquitectura **RAG**, que separa claramente dos responsabilidades:

1. **Recuperación de información relevante** (Retrieval)
2. **Generación de la respuesta** (Generation)

En lugar de entrenar un modelo con información de las empresas, el sistema:

* almacena el conocimiento en una base de datos
* recupera dinámicamente los fragmentos más relevantes
* los utiliza como contexto para generar respuestas

Esto permite:

* mayor control sobre la información
* evitar alucinaciones
* actualizar contenido sin reentrenar modelos

---

## Documentos como fuente de verdad

Los documentos subidos por una empresa representan la **fuente de verdad** del sistema.

Características:

* cada documento pertenece a una empresa
* los documentos pueden versionarse
* los documentos no se consultan directamente en tiempo real por el chat

El procesamiento del documento ocurre **una sola vez**, al momento de su carga o actualización.

---

## Chunking (segmentación de documentos)

Los documentos no se almacenan como una única unidad para la búsqueda semántica.

Proceso:

* el texto completo se divide en fragmentos más pequeños llamados **chunks**
* cada chunk tiene un tamaño aproximado de 300 a 800 caracteres
* cada chunk mantiene referencia al documento y a la empresa

Motivos:

* mayor precisión semántica
* menor ruido en las búsquedas
* menor cantidad de texto enviado al modelo

---

## Embeddings

Un **embedding** es una representación numérica del significado de un texto.

Características:

* se genera a partir de cada chunk
* consiste en un vector de números (por ejemplo, 1536 o 3072 dimensiones)
* textos con significado similar producen vectores cercanos entre sí

Los embeddings permiten realizar búsquedas por **significado**, no por coincidencia textual.

---

## Almacenamiento de embeddings

Los embeddings se almacenan en MongoDB utilizando **Vector Search**.

Cada chunk almacena:

* texto original
* embedding
* referencias a empresa y documento
* metadata del modelo de embeddings utilizado

Ejemplo conceptual:

```
Chunk
- companyId
- documentId
- documentVersionId
- text
- embedding[]
- embeddingModel
```

---

## Búsqueda vectorial

Cuando un usuario realiza una consulta:

1. la pregunta se convierte en un embedding
2. se ejecuta una búsqueda vectorial en MongoDB
3. se filtran resultados por empresa
4. se obtienen los chunks más cercanos semánticamente

Esta búsqueda devuelve únicamente fragmentos relevantes para la pregunta realizada.

---

## Construcción del contexto

Los chunks recuperados se utilizan para construir el contexto que se enviará al modelo de lenguaje.

Características del contexto:

* limitado a pocos fragmentos (generalmente 3 a 5)
* solo información relevante
* asociado únicamente a la empresa correspondiente

Esto reduce costos y mejora la calidad de las respuestas.

---

## Generación de respuestas

El modelo de lenguaje recibe:

* un prompt base (instrucciones del asistente)
* la pregunta del usuario
* los chunks relevantes como contexto

El modelo genera una respuesta:

* basada exclusivamente en el contexto provisto
* sin acceso directo a documentos completos
* sin memoria permanente fuera del sistema

---

## Control de alucinaciones

Para minimizar respuestas incorrectas:

* el prompt instruye al modelo a responder solo con información provista
* si no hay información suficiente, el asistente debe indicarlo explícitamente
* no se permite inferir datos externos

Esto garantiza respuestas confiables y auditables.

---

## Versionado de documentos

Cada vez que un documento se modifica:

1. se crea una nueva versión
2. se generan nuevos chunks y embeddings
3. la versión anterior queda inactiva
4. el chat utiliza únicamente la versión activa

Esto permite:

* historial de cambios
* rollback
* consistencia en las respuestas

---

## Modelos de embeddings y compatibilidad

Los embeddings dependen del modelo utilizado para generarlos.

Consideraciones:

* embeddings de distintos modelos no son compatibles entre sí
* cada chunk almacena información del modelo usado
* el sistema permite re-embeddar documentos si se cambia de proveedor

El modelo de generación de texto puede cambiar sin necesidad de regenerar embeddings.

---

## Seguridad y multi-empresa

Aspectos clave:

* cada chunk está asociado a una empresa
* las búsquedas siempre filtran por companyId
* no existe cruce de información entre empresas

Esto garantiza aislamiento total de datos.

---

## Beneficios de esta arquitectura

* escalabilidad
* control de costos
* facilidad para actualizar contenido
* independencia de proveedores de IA
* diseño preparado para múltiples canales (web, WhatsApp, etc.)

---

## Conclusión

La arquitectura basada en RAG permite a Stoodeo Chat ofrecer un asistente inteligente, confiable y adaptable, manteniendo el control total sobre el conocimiento de cada empresa y evitando los problemas comunes de soluciones basadas únicamente en modelos de lenguaje.

Este enfoque técnico es la base para construir un producto sólido y escalable a largo plazo.
