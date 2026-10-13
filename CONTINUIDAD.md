# Continuidad · YBESTUDIO Experience Engine

Fecha: 12 de octubre de 2026, America/Mexico_City. Base Git 21ea837. Estado inicial limpio; no se sobrescribieron cambios locales. No se encontraron AGENTS.md aplicables en el repositorio o sus directorios ascendentes revisados.

## Implementación

Se mantiene HTML/CSS/JS, ocho dimensiones, 40 IDs, colores #192026 / #7BBE11 / #E6EDD7, tema, menú circular, siete herramientas externas, ecosistema y modales existentes. No hay dependencias nuevas ni migración de framework.

Preguntas con conductas específicas, explicación, ejemplo y nota. Incertidumbre separada de puntuación. Progreso por respuestas registradas, posición independiente, cobertura explícita y resultado global condicionado por 3/5 en todas las dimensiones. Semáforo y presentación comparten motor. Recomendaciones explican origen, regla, objetivo y dependencias transitivas; detectan ciclos y evitan duplicados.

Recorrido por bloques con introducción, resumen neutral y revisión completa antes del cierre. El foco de preguntas y bloques desplaza el contenido a la vista, especialmente después del rail móvil. Navegación por rail, edición, localización de pendientes, guardar/salir y reanudación. Contexto/notas/acciones se guardan con debounce; los cambios significativos se registran al confirmar, salir del campo o navegar. La selección no avanza automáticamente.

Biblioteca versionada con diagnósticos independientes. Exportación e importación validadas, eliminación confirmada y copias editables de diagnósticos cerrados. Acciones tienen descripción, responsable, fecha objetivo y estado. Vista previa, impresión/PDF del navegador y JSON incluyen trazabilidad, cobertura y límites. No se introdujo envío de respuestas a terceros; el enlace de WhatsApp usa solo un saludo genérico.

## Migración

Claves: ybe-v5-state → biblioteca nueva ybe-assessments-v2, esquema 2. La clave antigua no se borra. El registro migrado conserva legacy.original completo y legacy.migratedAt; creación, actualización y cierre históricos desconocidos permanecen null. Resultado original consultable como datos, sin recalcular.

Cuestionario nuevo YBE-40Q-2, metodología YBE-M2; anterior YBE-V5-40Q-1. Todas las escalas cambiaron, por lo que se pide revisar los 40 IDs. La copia nueva conserva contexto y enlace de origen; no reutiliza puntuaciones antiguas. Las siguientes copias de una versión actual sí conservan respuestas actuales.

Un almacenamiento corrupto o no accesible bloquea escrituras sobre datos existentes. La interfaz permite trabajar en memoria y exportar el borrador; no informa que se guardó. La importación valida antes de escribir y rechaza duplicados. Las notas y el contexto se muestran como texto.

## Archivos cambiados

- `data/questions.json`
- `index.html`
- `js/app.js`
- `js/assessment.js`
- `js/data.js`
- `js/engine.js`
- `js/navigation.js`
- `js/report.js`
- `js/storage.js`
- `css/diagnostic.css`
- `tests/regression.cjs`
- `CAMBIOS-CUESTIONARIO.md`
- `METODOLOGIA.md`
- `README.md`
- `CONTINUIDAD.md`
- `RESULTADOS-PRUEBAS.txt`
- `inventario-sha256.json`

CAMBIOS-CUESTIONARIO.md documenta cada texto anterior/nuevo y las cuatro conductas por ID. METODOLOGIA.md documenta reglas provisionales y límites. Se actualiza el inventario SHA-256 del contenido de trabajo (la conversión de finales de línea en otro checkout puede cambiar hashes). Archivos de historial/ y verificacion-menu.json son registros anteriores, no prueba visual de esta versión.

## Verificación realizada

- Node v24.12.0: node tests/regression.cjs, 22 grupos aprobados.
- Sintaxis de los 10 módulos: node --check, aprobada.
- HTML: etiquetas balanceadas e IDs únicos mediante HTMLParser de Python.
- Python 3.12.6: servidor HTTP local; index y questions.json respondieron 200.
- git diff --check: sin errores (Git avisa de conversión LF/CRLF).
- Diff y búsqueda de secretos/patrones sospechosos revisados: no se detectaron claves privadas, tokens conocidos, eval, scripts remotos o telemetría en el alcance revisado. Esto no es una auditoría exhaustiva.
- No hay una skill de revisión de seguridad aplicable instalada. Los datos importados no se interpolan en HTML; los modales existentes usan únicamente catálogos locales, que no se modificaron.

Las pruebas cubren IDs/escalas, progreso inicial y última pregunta abierta, incertidumbre, cobertura mínima/global, límites de semáforo, edición y revisiones, fortalezas, objetivo sin modificar puntuación, dependencias/ciclos, migración, rechazo de JSON y resultados alterados, originales cerrados, almacenamiento corrupto/bloqueado y HTML como texto.

Los controladores reales se ejercitaron con DOM simulado: iniciar → contexto → intro → responder → salir → recargar → reanudar → ocho bloques → revisión de 40 → cerrar resultado parcial → seleccionar acción en copia → reporte → JSON reimportable → invocar impresión. También rechazo de importación desde la interfaz y exportación de borrador con almacenamiento corrupto.

## Pendientes de verificación

No se pudo realizar comprobación visual: Chrome agotó el tiempo de conexión; navegador integrado no disponible; inventario CUA sin navegadores. Se leyó la skill computer-use antes del intento.

Queda comprobar en navegador real a 320, 390, 768 y 1440 px: textos largos, desbordamientos, claro/oscuro, foco visible y lectura accesible, navegación completa, rail, modales/teclado, descargas reales y paginación de impresión. La prueba automatizada confirma que se invoca window.print(); no confirma un PDF impreso ni su paginación. No se verificó disponibilidad actual de sitios externos ni se publicaron cambios.

## Git y CI/CD reales

Rama main, upstream origin/main, remoto https://github.com/DanyVeneno/ybestudioengine.git. No existen package.json, scripts de build/deploy, workflows de GitHub Actions, archivos de CI/CD o hooks activos (solo .sample). El servidor local es el único comando de ejecución encontrado/documentado; no es un despliegue.

No puede determinarse si un push activa un despliegue externo: no hay flujo configurado en los archivos, pero pueden existir integraciones o webhooks en el proveedor. Faltan la integración de Hostinger/GitHub o configuración del VPS, sitio/ruta de destino, rama observada y mecanismo de publicación. No se inventa comando de actualización.

Git detectó diferencia de propietario entre usuario del repositorio y ejecutor. Se usó -c safe.directory=... por comando; no se alteró la configuración global.

## Comandos para el usuario, después de revisar

Estos comandos no fueron ejecutados para añadir, hacer commit ni push:

```powershell
$gitArgs = @('-c', 'safe.directory=C:/Users/YehiiBhii/YBESTUDIO-Experience-Engine-V5-FIXED')
git @gitArgs status --short
git @gitArgs diff --check
git @gitArgs diff -- data/questions.json index.html js/app.js js/assessment.js js/data.js js/engine.js js/navigation.js js/report.js js/storage.js tests/regression.cjs README.md METODOLOGIA.md CONTINUIDAD.md RESULTADOS-PRUEBAS.txt inventario-sha256.json
Get-Content CAMBIOS-CUESTIONARIO.md, css/diagnostic.css
node tests/regression.cjs
git @gitArgs add -- data/questions.json index.html js/app.js js/assessment.js js/data.js js/engine.js js/navigation.js js/report.js js/storage.js css/diagnostic.css tests/regression.cjs CAMBIOS-CUESTIONARIO.md METODOLOGIA.md README.md CONTINUIDAD.md RESULTADOS-PRUEBAS.txt inventario-sha256.json
git @gitArgs diff --cached --check
git @gitArgs diff --cached --stat
git @gitArgs commit -m "Mejora diagnóstico, continuidad y trazabilidad local"
git @gitArgs push origin main
```

Verifica los pendientes visuales y la integración real de hosting antes de publicar. No se hicieron commit, push ni despliegue en esta sesión.
