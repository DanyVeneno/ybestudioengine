# Diagnóstico y comparación — ZIP local YBESTUDIO V5 FIXED
Fecha: 7 de octubre de 2026, México.

## Diagnóstico previo a las correcciones
El ZIP contiene 29 archivos de proyecto fuera del historial Git: HTML, 9 módulos JavaScript, 4 hojas CSS, 6 JSON, 8 recursos de marca y README. Diagnóstico de 40 preguntas y 8 dimensiones. Incluye tema, herramientas y modales: es la base publicada anterior a Revisión 1.

Se consultaron hoy 28 rutas equivalentes en https://ybestudio.com/: todas respondieron 200. 24 archivos coinciden byte por byte; cuatro coinciden en texto después de normalizar CRLF/LF: js/app.js, js/tools-menu.js, css/styles.css y css/animations.css. README se conserva como documentación local y no se usó como referencia pública.

Conclusión: no se identificaron diferencias funcionales entre el código local recibido y los archivos públicos comparados. El ZIP original generado al principio del proyecto sí era anterior; tu archivo actual contiene las mejoras publicadas. La comparación no inspecciona configuración privada del servidor.

## Hallazgos antes de editar
Resultado guardado no se recalculaba al cambiar respuestas. Completitud se evaluaba por cantidad de claves, sin verificar cada pregunta y nivel. Tarjetas de ecosistema usaban artículos con clic sin activación nativa de teclado. Navegación se ocultaba bajo 900px. Referencia a /favicon.png no corresponde a un archivo del paquete. Texto verde claro #4b760b contra #E6EDD7 tenía contraste aproximado 4.48:1.

## Correcciones acumulativas aplicadas
Mismas correcciones de Revisión 1: recálculo al editar, consultar y recuperar resultados; validación de respuestas completas y permitidas; tarjetas con botones accesibles; estado seleccionado anunciado y foco conservado; foco en encabezados al navegar; movimiento reducido; navegación móvil visible; ajustes de ancho y texto; contraste de acento claro a #486f0b; modal sólido #E6EDD7; favicon válido.
Se preservan todos los datos, recursos de marca, scripts restantes y README del ZIP local. El original no se modificó. El ZIP entregable omite el historial .git; para usarlo en tu repositorio, copiar los archivos sobre tu carpeta existente conservando su .git y revisar git diff antes de confirmar cambios.

## Verificación del paquete corregido
Pasan las pruebas de recálculo inmediato (51 global, 60 IA), invalidación por preguntas faltantes o niveles no válidos y reinicio/cancelación con DOM simulado. Pasa sintaxis de los nueve módulos, JSON válidos, presencia de importaciones y referencias locales, y conteo de 40 preguntas. Estos controles no sustituyen una prueba visual.
La validación anterior del sitio publicado confirmó recorrido completo, recuperación, reinicio y ciclo de foco de modal. No confirma automáticamente el renderizado de la copia corregida.

## Pendientes de continuidad
Validación visual en navegador HTTP a 320, 390, 768 y 1440px; recorrido completo de teclado de la revisión. El navegador disponible bloqueó los archivos locales en la sesión anterior. Quedan interpretación de empates, destino directo de WhatsApp y reanudación explícita. No se publicó ni alteró el servidor.

## Ejecutar
Dentro de la carpeta: python3 -m http.server 8000; abrir http://localhost:8000. Alternativa: Live Server. Pruebas: node tests/regression.cjs.
