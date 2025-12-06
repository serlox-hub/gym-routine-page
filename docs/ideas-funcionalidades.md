# Ideas de Funcionalidades

Lista de funcionalidades potenciales para mejorar la aplicación, ordenadas por prioridad.

---

## 🎯 Alta Prioridad

### 1. Progresión y Gráficas por Ejercicio
- Ver evolución del peso/reps en un ejercicio específico a lo largo del tiempo
- Gráfica de 1RM estimado por ejercicio
- Vista dedicada para analizar progreso histórico de cada ejercicio

### 2. Plantillas de Entrenamiento Predefinidas
- Rutinas populares listas para usar (PPL, Upper/Lower, Full Body, 5/3/1)
- Permite a usuarios nuevos empezar más rápido sin crear todo desde cero

### 3. Supersets y Circuitos
- Agrupar 2-3 ejercicios para hacer sin descanso entre ellos
- Muy común en entrenamientos de hipertrofia y funcionales

### 4. Registro de Peso Corporal
- Trackear peso del usuario a lo largo del tiempo
- Calcular ratios de fuerza (ej: sentadilla vs peso corporal)
- Gráfica de evolución del peso

---

## 📊 Media Prioridad

### 5. Estadísticas Avanzadas
- Volumen semanal por grupo muscular
- Frecuencia de entrenamiento por músculo
- PRs (records personales) destacados con fechas
- Comparativa semana vs semana

### 6. Descanso Automático con Notificación
- Vibración/sonido cuando termine el timer de descanso
- Auto-iniciar timer después de completar un set
- Notificación aunque la app esté en segundo plano

### 7. Duplicar Rutinas/Días
- Copiar una rutina existente para modificarla
- Duplicar un día de entrenamiento dentro de la misma rutina
- Agiliza la creación de rutinas similares

### 8. Modo Offline
- Entrenar sin conexión a internet
- Sincronizar datos cuando vuelva la conexión
- Útil en gimnasios con mala señal WiFi/datos

---

## 💡 Baja Prioridad (Nice to Have)

### 9. Notas de Entrenamiento Globales
- Diario de entrenamiento personal
- Registrar lesiones, sensaciones, estado de ánimo
- Asociar notas a fechas específicas

### 10. Objetivos y Metas
- Definir metas específicas (ej: "sentadilla 100kg", "10 dominadas")
- Trackear progreso hacia cada meta
- Notificación cuando se alcance un objetivo

### 11. Compartir Rutinas
- Exportar rutina con link o código único
- Otros usuarios pueden importar la rutina fácilmente
- Biblioteca de rutinas compartidas por la comunidad

---

## Estado Actual de la App

### Funcionalidades ya implementadas:
- Autenticación (login/signup con Supabase)
- CRUD completo de rutinas y días de entrenamiento
- Biblioteca de ejercicios personalizados
- Múltiples tipos de medición (peso+reps, solo reps, tiempo, distancia, etc.)
- Sesiones de entrenamiento con registro de sets
- Timer de descanso configurable
- Historial con calendario mensual
- Detalle de sesiones completadas
- Gráfica de duración mensual
- Import/export de rutinas como JSON
- RIR (Reps In Reserve) por set
- Notas por set y por sesión
