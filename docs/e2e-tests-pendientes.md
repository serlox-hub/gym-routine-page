# Tests E2E Pendientes

## Estado actual: 90 tests pasando

### Features cubiertas ✅
- Login/Signup (formularios, validaciones)
- Home (carga, ver rutinas)
- NewRoutine (crear manual, templates)
- RoutineDetail (ver, editar, añadir día)
- WorkoutSession (iniciar sesión)
- History (acceso)
- Import/Export (JSON)
- Responsive (móvil, tablet, desktop)
- Accesibilidad (labels, navegación teclado)
- Protección de rutas (redirección a login)
- **Exercises** - Listar, buscar, crear ejercicios
- **NewExercise** - Formulario, validaciones, grupos musculares
- **BodyWeight** - Registrar peso, estadísticas, historial
- **EditExercise** - Editar ejercicio existente, guardar cambios
- **SessionDetail** - Ver detalle de sesión pasada, navegación
- **FreeWorkoutSession** - Iniciar, cancelar, añadir ejercicios
- **ExerciseProgress** - Ver página de progresión, historial

### Features pendientes de tests

#### Prioridad baja (difícil de testear)
- [ ] **ForgotPassword** - Requiere verificar email
- [ ] **ResetPassword** - Requiere token de email
- [ ] **AdminUsers** - Requiere usuario admin

## Notas
- Los tests usan un usuario de test (`test@gym.app`)
- El setup crea una rutina de prueba automáticamente
- El teardown limpia TODOS los datos del usuario de test
