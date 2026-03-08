# Propuesta: Generación directa de rutinas con IA

## Estado actual
El flujo actual es manual: el usuario copia un prompt generado, lo pega en ChatGPT/Claude, y pega el JSON de vuelta en la app. Funciona bien pero requiere varios pasos.

## Objetivo
Integrar una API de IA directamente para que el usuario pulse un botón y reciba la rutina importada automáticamente.

## Proveedores evaluados

| Proveedor | Modelo | Coste | Calidad | Resultado |
|-----------|--------|-------|---------|-----------|
| Google Gemini | gemini-2.0-flash | Gratis (free tier) | Buena | ❌ Free tier no disponible en todas las regiones/cuentas |
| Google Gemini | gemini-2.0-flash-lite | Gratis | Buena | ❌ Mismo problema de cuota |
| Groq | llama-3.3-70b | Gratis | Mala | ❌ Rutinas con 2-3 ejercicios por día, sin base científica, nombres de días incoherentes |
| OpenAI | gpt-4o-mini | ~$0.01/rutina | Excelente | ✅ Recomendado si se acepta coste mínimo |

## Conclusión
Los modelos gratuitos no generan rutinas de calidad suficiente. GPT-4o-mini (OpenAI) es la mejor opción calidad/precio (~$0.01 por rutina, $5 para +500 rutinas).

## Implementación (si se retoma)

### Archivos a crear/modificar
- `src/lib/aiRoutineGenerator.js` — Cliente API (OpenAI compatible)
- `src/components/Routine/ChatbotPromptModal.jsx` — Añadir botón "Generar con IA" + estado de carga
- `src/pages/Home.jsx` — Nuevo callback `onAiGenerated` que conecta con el flujo de importación existente

### Variable de entorno
```
VITE_OPENAI_API_KEY=sk-...
```

### Flujo propuesto
1. Usuario rellena formulario (objetivo, días, nivel, duración, equipamiento)
2. Se genera el prompt con `buildChatbotPrompt()` (ya existe)
3. Se envía a la API de OpenAI con `response_format: { type: 'json_object' }`
4. Se parsea el JSON y se pasa al flujo de importación existente (`importRoutine()`)
5. La rutina aparece creada automáticamente

### Código de referencia (API call)
```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  }),
})
```

### Consideraciones de seguridad
- La API key va en una variable de entorno (`VITE_`) y se incluye en el build del cliente
- Cualquiera puede extraerla del JS del navegador
- Riesgo mitigable: si alguien abusa, se rota la key
- Alternativa más segura: Supabase Edge Function como proxy (la key nunca llega al cliente)

### UX
- Si hay API key configurada: mostrar botón "Generar con IA" como opción principal
- Siempre mantener el flujo manual como fallback ("Ver prompt" / "Copiar prompt")
- Mostrar spinner con mensaje "Generando tu rutina personalizada..."
- Si falla: mostrar error + botón reintentar + opción de caer al flujo manual
