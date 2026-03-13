# Roadmap de Producto - Gym Tracker

Estrategia: posicionarse como **la mejor app de gym en español** con **periodización inteligente** y opción de **modo entrenador** como diferenciador.

Modelo de monetización: **Freemium generoso** con Pro a $5-8/mes o $30-50/año.

---

## Fase 1 — Retención y engagement

Objetivo: que los usuarios actuales no se vayan y usen la app más.

### 1.1 PRs y logros automáticos
- Detectar automáticamente nuevos récords personales (peso máximo, volumen, 1RM)
- Mostrar notificación/badge cuando se rompe un PR durante el entrenamiento
- Pantalla de récords por ejercicio
- Indicador visual en historial cuando una sesión tuvo PRs

### 1.2 Streak / racha de entrenamiento
- Contador de días/semanas consecutivas entrenando
- Mostrar racha en la pantalla principal
- Racha semanal (ej: 3 de 4 días objetivo cumplidos)

### 1.3 Resumen de entrenamiento compartible
- Generar imagen resumen al terminar sesión (ejercicios, volumen, duración, PRs)
- Botón "Compartir" para WhatsApp/Instagram Stories
- Diseño visual atractivo con branding de la app

### 1.4 Mejoras de UX en sesión activa
- Copiar sets de la sesión anterior con un tap
- Swipe para completar set rápidamente
- Feedback háptico al completar ejercicio

---

## Fase 2 — Periodización inteligente

Objetivo: diferenciarse de la competencia con programación seria.

### 2.1 Progresión automática
- Configurar regla de progresión por ejercicio (ej: +2.5kg cuando completes 3x8)
- Sugerir peso/reps para la siguiente sesión basado en historial
- Indicador visual: "Sube peso", "Repite", "Reduce"

### 2.2 Mesociclos
- Definir mesociclos de 4-6 semanas con objetivo (fuerza, hipertrofia, deload)
- Vista de calendario del mesociclo
- Deload automático cada X semanas (configurable)

### 2.3 Volumen semanal por grupo muscular
- Dashboard con series semanales por grupo muscular
- Rangos recomendados (MRV, MAV, MEV) configurables
- Alerta si un grupo muscular está por debajo o por encima del rango

### 2.4 Fatiga y recuperación
- Estimación de fatiga por grupo muscular basada en volumen reciente
- Sugerencia de qué día entrenar según recuperación
- Indicador visual de estado de cada grupo muscular

---

## Fase 3 — Base de ejercicios

Objetivo: reducir la barrera de entrada para usuarios nuevos.

### 3.1 Ejercicios predefinidos con información
- Base de datos de ~100 ejercicios comunes precargados
- Grupo muscular, descripción, instrucciones en español
- Músculo primario y secundario

### 3.2 GIFs o enlaces a videos
- Imagen/GIF demostrativo por ejercicio (o link a YouTube)
- Permitir al usuario añadir su propio link de video a ejercicios custom

### 3.3 Búsqueda mejorada
- Buscar por grupo muscular + equipamiento
- Filtro por tipo de ejercicio (compuesto, aislamiento)
- Sugerencias de ejercicios alternativos

---

## Fase 4 — Monetización (Pro)

Objetivo: implementar el modelo freemium.

### 4.1 Definir límites del plan gratuito
- Propuesta inicial:
  - Free: 3 rutinas, historial de 90 días, ejercicios ilimitados
  - Pro: rutinas ilimitadas, historial completo, analytics avanzados, periodización
- Paywall suave (mostrar feature bloqueada, no bloquear el flujo principal)

### 4.2 Pasarela de pago
- Integrar Stripe (web) y compras in-app (iOS/Android)
- Planes: mensual, anual, lifetime
- Gestión de suscripción en settings

### 4.3 Features Pro
- Gráficos avanzados de progreso (comparativas, tendencias)
- Periodización (Fase 2)
- Export CSV/PDF de historial
- Temas de color personalizados

---

## Fase 5 — Modo Entrenador (B2B)

Objetivo: monetización adicional vía coaches/entrenadores.

### 5.1 Cuenta de entrenador
- Rol "entrenador" con dashboard propio
- Crear y asignar rutinas a clientes
- Ver progreso de clientes

### 5.2 Gestión de clientes
- Invitar clientes por email/link
- Panel con overview de todos los clientes
- Alertas: cliente no entrena hace X días, PR alcanzado

### 5.3 Pricing entrenador
- Plan entrenador: $15-25/mes (hasta 20 clientes)
- Plan gym/estudio: $50-100/mes (clientes ilimitados)

---

## Fase 6 — Social (si hay tracción)

Objetivo: crecimiento orgánico via red de usuarios.

### 6.1 Perfil público
- Stats públicos (días entrenados, rachas, PRs)
- Feed de actividad de amigos

### 6.2 Seguir amigos
- Buscar/añadir amigos
- Ver entrenamientos de amigos en un feed

### 6.3 Compartir rutinas
- Link público para compartir rutina
- Rutinas destacadas de la comunidad

---

## Fase 7 — Wearables

### 7.1 Apple Watch
- Logging rápido de sets desde el reloj
- Timer de descanso en la muñeca
- Frecuencia cardíaca durante sesión

### 7.2 Health integrations
- Sincronizar con Apple Health / Google Fit
- Exportar entrenamientos como actividad

---

## Backlog (sin prioridad definida)

- [ ] Onboarding personalizado (objetivo, experiencia, días disponibles)
- [ ] Notificaciones push (recordatorio de entrenamiento)
- [ ] Modo offline completo con sync
- [ ] Backup/restore automático
- [ ] Temas claros/oscuros
- [ ] Internacionalización (i18n) para expandir más allá del español
- [ ] Integración con ChatGPT/Claude API directa (sin copy-paste del prompt)
