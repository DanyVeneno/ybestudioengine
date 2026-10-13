# YBESTUDIO Experience Engine V5

Aplicación estática acumulativa HTML/CSS/JavaScript, sin framework ni dependencias nuevas. Conserva identidad institucional, tema claro/oscuro, menú orbital de ocho capacidades y siete herramientas, modales, accesibilidad y reportes.

El cuestionario YBE-40Q-2 y metodología YBE-M2 incluyen 40 preguntas, incertidumbre, notas opcionales, cobertura mínima, recomendaciones explicadas y dependencias transitivas. [Metodología](METODOLOGIA.md) y [cambios por pregunta](CAMBIOS-CUESTIONARIO.md).

## Ejecutar y verificar

Desde la raíz, con Python y Node instalados:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Abrir http://127.0.0.1:8000. Se requiere HTTP para cargar JSON y módulos; no abrir por file://. Usa el mismo origen (protocolo, host y puerto) para recuperar los mismos datos locales.

En otra consola:

```powershell
node tests/regression.cjs
Get-ChildItem js -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Las pruebas no instalan paquetes. Ejecutan módulos y controladores reales con DOM simulado; no sustituyen la comprobación visual en navegador.

## Recorrido y datos

Inicio / reanudar → objetivo → contexto → introducción del bloque → cinco preguntas → resumen → siguiente bloque → revisión de las 40 → confirmar → resultado y acciones. Seleccionar respuesta no avanza automáticamente. El rail permite navegar por bloques y la revisión localiza pendientes.

Biblioteca local en ybe-assessments-v2, esquema 2: ID anónimo, versiones, fechas conocidas, borrador/finalizado, objetivo, contexto, respuestas por ID, revisiones, resultado, cobertura y acciones. Guardado de texto con debounce de 450 ms; historial al confirmar cambios significativos. Los errores de guardado se muestran y el borrador puede exportarse aun si localStorage está bloqueado.

“Diagnósticos anteriores / importar” permite consultar, exportar, importar con validación y eliminar un diagnóstico con confirmación explícita. Crear un nuevo diagnóstico conserva anteriores. Editar un finalizado o elegir nuevas acciones genera una copia editable enlazada al original. Confirma de nuevo desde revisión para cerrar esa copia.

JSON exportado: {schemaVersion:2, assessment, report?}. Se importa el diagnóstico validado; el reporte adjunto no controla resultados ni HTML. IDs duplicados se rechazan sin sobrescribir. Límites defensivos: archivo de 2 MB, 200 diagnósticos, 40 respuestas, 100 acciones, 10 000 revisiones y profundidad menor de 30. Fechas y valores se validan. Los textos se renderizan mediante textContent y value.

Migración no destructiva de ybe-v5-state: la clave anterior permanece intacta. Un registro separado conserva todo el estado en legacy.original, con fecha de migración y sin inventar creación, actualización o cierre históricos. No recalcula valores antiguos. Las 40 escalas requieren revisión. Puede consultarse el JSON original y crear una copia con el contexto y respuestas nuevas.

El reporte presenta vista previa, impresión / guardar PDF mediante el navegador y JSON. Incluye identidad, fechas, cobertura, incertidumbre, notas no verificadas, justificación, dependencias, acciones y límites.

## Continuidad y publicación

[CONTINUIDAD.md](CONTINUIDAD.md) contiene estado real de Git, archivos cambiados, resultados, pendientes visuales y comandos de revisión/commit/push. No hay scripts de build ni despliegue en el repositorio. No se hizo commit, push o publicación.
