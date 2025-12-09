# Tests E2E Pendientes

## Estado actual: 44 tests pasando

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

### Features pendientes de tests

#### Prioridad alta
- [ ] **Exercises** - Listar ejercicios existentes
- [ ] **NewExercise** - Crear ejercicio nuevo
- [ ] **BodyWeight** - Registrar peso corporal

#### Prioridad media
- [ ] **EditExercise** - Editar ejercicio existente
- [ ] **SessionDetail** - Ver detalle de sesión pasada
- [ ] **FreeWorkoutSession** - Sesión de entrenamiento libre
- [ ] **ExerciseProgress** - Ver gráficas de progreso

#### Prioridad baja (difícil de testear)
- [ ] **ForgotPassword** - Requiere verificar email
- [ ] **ResetPassword** - Requiere token de email
- [ ] **AdminUsers** - Requiere usuario admin

## Notas
- Los tests usan un usuario de test (`test@gym.app`)
- El setup crea una rutina de prueba automáticamente
- El teardown limpia TODOS los datos del usuario de test
