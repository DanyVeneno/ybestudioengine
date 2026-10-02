# YEHIIBHII Experience Engine V5

V5 consolida y corrige la arquitectura V4. No es un micrositio independiente: es la nueva base maestra del prototipo HTML/CSS/JS.

## Qué incluye
- Home y propuesta de integración de tecnología web.
- Selector “¿Qué necesitas?”.
- Digital Maturity Assessment de 40 preguntas / 8 dimensiones.
- Persistencia local V5.
- Resultado global y por dimensión.
- Fortalezas, brechas y prioridades.
- Dependency Engine.
- Knowledge Engine.
- Roadmap dinámico.
- Ecosistema de 8 capacidades con modales.
- Recursos relacionados.
- CTA contextual a WhatsApp.
- Sistema orbital animado y microanimaciones discretas.
- Mensaje visible de diagnóstico si los JSON no pueden cargarse.

## Corrección principal respecto a V4
V4 cargaba `questions.json` como objeto `{levels, dimensions}`, pero `app.js` y `assessment.js` lo trataban como un array plano de preguntas. V5 incorpora `js/data.js`, que normaliza el dataset a un contrato único de 40 preguntas con `id`, `dimension`, `dimensionLabel`, `text` y `levels`.

También se normaliza `value -> score` en los niveles y se usa una nueva clave de localStorage (`ybe-v5-state`) para no reutilizar estado incompatible de V4.

## Cómo ejecutar
Los datos se cargan con `fetch()`, por lo que debe ejecutarse con servidor HTTP. En VS Code puede utilizarse Live Server. No abrir `index.html` directamente con `file://`.
# ybestudioengine
