# Fase 1: Setup Supabase + Modelo de Datos

## Objetivos
1. Crear proyecto Supabase
2. Crear todas las tablas de catálogos (muscles, equipment, grips)
3. Crear tablas de ejercicios y rutinas
4. Crear tablas de sesiones y tracking
5. Script de migración: importar datos del JSON actual

---

## Tablas de Catálogos (datos maestros)

```sql
-- Grupos musculares
CREATE TABLE muscle_groups (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,       -- "Espalda", "Pecho", "Bíceps"
    categoria TEXT                     -- "Superior", "Inferior", "Core"
);

-- Músculos específicos
CREATE TABLE muscles (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,       -- "Dorsal ancho", "Bíceps braquial (cabeza larga)"
    muscle_group_id INT REFERENCES muscle_groups(id),
    nombre_corto TEXT                  -- Para mostrar en UI compacta
);

-- Tipos de equipamiento
CREATE TABLE equipment_types (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE        -- "Barra", "Mancuernas", "Polea", "Máquina", "Peso corporal"
);

-- Equipamiento específico
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,              -- "Barra recta", "Barra EZ", "Mancuernas"
    equipment_type_id INT REFERENCES equipment_types(id),
    UNIQUE(nombre, equipment_type_id)
);

-- Tipos de agarre
CREATE TABLE grip_types (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE        -- "Prono", "Supino", "Neutro", "Mixto"
);

-- Aperturas de agarre
CREATE TABLE grip_widths (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE        -- "Cerrado", "Medio", "Ancho", "N/A"
);
```

---

## Tablas de Ejercicios

```sql
-- Catálogo de ejercicios
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    nombre_en TEXT,
    equipment_id INT REFERENCES equipment(id),
    grip_type_id INT REFERENCES grip_types(id),
    grip_width_id INT REFERENCES grip_widths(id),
    altura_polea TEXT,                 -- "Alta", "Media", "Baja", NULL
    instrucciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Músculos trabajados por ejercicio (N:M)
CREATE TABLE exercise_muscles (
    exercise_id INT REFERENCES exercises(id) ON DELETE CASCADE,
    muscle_id INT REFERENCES muscles(id),
    es_principal BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (exercise_id, muscle_id)
);
```

---

## Tablas de Rutinas

```sql
-- Rutinas
CREATE TABLE routines (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    objetivo TEXT,                     -- "Hipertrofia", "Fuerza", "Definición"
    frecuencia_dias INT,               -- días por semana
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Días de la rutina
CREATE TABLE routine_days (
    id SERIAL PRIMARY KEY,
    routine_id INT REFERENCES routines(id) ON DELETE CASCADE,
    dia_numero SMALLINT NOT NULL,      -- 1, 2, 3, 4
    nombre TEXT NOT NULL,              -- "Core + Espalda + Bíceps"
    duracion_estimada_min INT,
    orden SMALLINT,
    UNIQUE(routine_id, dia_numero)
);

-- Bloques dentro de cada día
CREATE TABLE routine_blocks (
    id SERIAL PRIMARY KEY,
    routine_day_id INT REFERENCES routine_days(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,              -- "Core", "Espalda", "Bíceps"
    orden SMALLINT NOT NULL,
    duracion_min INT
);

-- Ejercicios dentro de cada bloque (la rutina específica)
CREATE TABLE routine_exercises (
    id SERIAL PRIMARY KEY,
    routine_block_id INT REFERENCES routine_blocks(id) ON DELETE CASCADE,
    exercise_id INT REFERENCES exercises(id),
    orden SMALLINT NOT NULL,
    series SMALLINT NOT NULL,          -- 3, 4
    reps TEXT NOT NULL,                -- "8-10", "10-12", "10/lado"
    rir SMALLINT,                      -- 1, 2
    descanso_seg INT,                  -- 90, 120
    tempo TEXT,                        -- "1-1-3-1"
    tempo_razon TEXT,                  -- explicación científica
    notas TEXT,                        -- instrucciones específicas
    es_calentamiento BOOLEAN DEFAULT FALSE
);
```

---

## Tablas de Sesiones (tracking)

```sql
-- Sesiones de entrenamiento
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_day_id INT REFERENCES routine_days(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_minutes SMALLINT,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    notas TEXT,
    sensacion_general SMALLINT CHECK (sensacion_general BETWEEN 1 AND 5)
);

-- Series completadas
CREATE TABLE completed_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    routine_exercise_id INT REFERENCES routine_exercises(id),
    exercise_id INT REFERENCES exercises(id),  -- referencia directa para queries
    set_number SMALLINT NOT NULL,
    weight DECIMAL(6,2),
    reps_completed SMALLINT,
    rir_actual SMALLINT,
    completed BOOLEAN DEFAULT FALSE,
    notas TEXT,                        -- molestias, sensaciones
    performed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Índices para Performance

```sql
CREATE INDEX idx_completed_sets_exercise ON completed_sets(exercise_id, performed_at DESC);
CREATE INDEX idx_completed_sets_session ON completed_sets(session_id);
CREATE INDEX idx_sessions_date ON workout_sessions(started_at DESC);
CREATE INDEX idx_sessions_routine_day ON workout_sessions(routine_day_id, started_at DESC);
```

---

## Diagrama de Relaciones

```
muscle_groups ─< muscles ─< exercise_muscles >─ exercises
                                                    │
equipment_types ─< equipment ──────────────────────┘
                                                    │
grip_types ────────────────────────────────────────┘
grip_widths ───────────────────────────────────────┘

routines ─< routine_days ─< routine_blocks ─< routine_exercises >─ exercises
                │
                └─< workout_sessions ─< completed_sets >─ exercises
```

---

## Tareas

- [ ] Crear proyecto en Supabase
- [ ] Ejecutar SQL para crear tablas de catálogos
- [ ] Ejecutar SQL para crear tablas de ejercicios
- [ ] Ejecutar SQL para crear tablas de rutinas
- [ ] Ejecutar SQL para crear tablas de sesiones
- [ ] Ejecutar SQL para crear índices
- [ ] Crear script de migración desde JSON
- [ ] Ejecutar migración de datos
