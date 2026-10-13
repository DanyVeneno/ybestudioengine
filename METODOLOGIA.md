# Metodología YBE-M2 · Cuestionario YBE-40Q-2

Versión de producto del 12 de octubre de 2026. Autoevaluación orientativa de capacidades declaradas. No es una certificación ni un instrumento científicamente validado.

## Preguntas y escala

40 preguntas, ocho dimensiones con cinco preguntas cada una: Estrategia, Cliente, UX/CX, Procesos, Tecnología, Datos, Automatización e Inteligencia Artificial. IDs estables dimension-1 a dimension-5. Cada pregunta incluye texto, explicación, ejemplo para pymes y cuatro conductas específicas de 25, 50, 75 y 100. El rango evaluado es **25–100**, no 0–100.

La secuencia reconoce, define, aplica, mide y mejora capacidades, adaptada a cada dimensión conservando continuidad con los IDs anteriores. En IA, las primeras cuatro preguntas preparan conocimiento, caso, datos y controles; la quinta distingue exploración, piloto, operación y medición. Automatización-2 evalúa preparación y priorización; una acumulación de trabajo manual no mejora la puntuación.

Las preguntas con controles múltiples explican qué comprobar. En tecnología-4 e IA-3 se pide elegir el nivel común más bajo de los controles. Estas comprobaciones no añaden preguntas ni puntos. Las notas no afectan el resultado. El registro de textos anteriores, nuevos y las 160 conductas aparece en [CAMBIOS-CUESTIONARIO.md](CAMBIOS-CUESTIONARIO.md).

## Progreso, cobertura y madurez declarada

- Progreso: respuestas registradas, incluyendo “No lo sé”. La posición de una pregunta no modifica progreso.
- Cobertura: respuestas con estado scored y valor 25, 50, 75 o 100.
- Incertidumbre: estado unknown, valor null. No cuenta como cero ni se incluye en un promedio.
- Una nota antes de elegir respuesta puede quedar en estado pending; no suma progreso.
- Evidencia aportada: notas textuales opcionales, no verificadas.

Una dimensión se calcula con **al menos 3/5 puntuables**, promediando únicamente sus valores disponibles. Sin esa cobertura se muestra “Sin puntuación”, nunca cero ni baja madurez. El global es el promedio con igual peso de las ocho dimensiones y existe únicamente si las ocho cumplen el mínimo. El cierre permite resultados parciales, pero exige registrar las 40 respuestas (incluida incertidumbre) y confirmar desde la revisión.

**La cobertura mínima 3/5 es una decisión provisional del producto, pendiente de validación metodológica.** La cobertura acompaña cada puntuación agregada en pantalla y reporte.

## Semáforo y rankings

El motor calcula con precisión completa; la interfaz y el reporte presentan hasta dos decimales. Semáforo sobre el valor sin redondear: rojo <40; amarillo ≥40 y <80; verde ≥80. Se conservan los niveles de data/maturity.json: fundamentos, integración, evolución y ecosistema avanzado.

Los empates conservan la secuencia de dimensiones. “Capacidades relativamente mejor evaluadas” es un ranking relativo, incluso si son bajas. “Fortaleza declarada” se reserva para verde con 5/5 puntuables y sigue sin implicar verificación.

## Recomendaciones y dependencias

El objetivo prioriza las capacidades relacionadas, sin alterar la puntuación. Cada recomendación registra IDs, textos y respuestas de origen, la regla aplicada, capacidad, relación con objetivo, acción y dependencias previas. Puntuaciones disponibles <80 originan fortalecimiento; falta de cobertura origina aclaración o recopilación de información.

Dependencia débil: puntuación disponible **<65**, centralizada en RULES.weakDependency. **Es una regla provisional**, no un umbral validado. Una dependencia sin cobertura también se recorre para solicitar información, sin inferir baja madurez. DFS transitivo visita requisitos antes del destino, elimina duplicados y detecta ciclos. Los ciclos se anuncian para revisar el mapa; no provocan recursión infinita.

## Migración y límites

La metodología anterior se identifica como YBE-V5-40Q-1. Todas las escalas cambiaron de descripción; ninguna puntuación antigua se considera una respuesta al cuestionario nuevo. Se conserva íntegro el estado original y se solicita revisar las 40 preguntas. No se comparan automáticamente puntuaciones entre versiones.

Las declaraciones, el contexto y las notas necesitan contraste con información del negocio. Seleccionar una acción no garantiza su beneficio. No hay proveedor LLM, backend, cuentas, telemetría ni sincronización.
