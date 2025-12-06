-- Simplificar ejercicios: añadir grupo muscular directamente en la tabla exercises
-- En lugar de una relación N:M, cada ejercicio tiene un solo grupo muscular

-- Añadir columna muscle_group_id a exercises
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS muscle_group_id INT REFERENCES muscle_groups(id);

-- Migrar datos existentes: asignar el grupo muscular principal (o el primero encontrado)
UPDATE exercises e
SET muscle_group_id = (
    SELECT m.muscle_group_id
    FROM exercise_muscles em
    JOIN muscles m ON m.id = em.muscle_id
    WHERE em.exercise_id = e.id
    ORDER BY em.es_principal DESC
    LIMIT 1
)
WHERE e.muscle_group_id IS NULL;

COMMENT ON COLUMN exercises.muscle_group_id IS 'Grupo muscular principal del ejercicio';
