-- New system exercise "Machine Assisted Dips" (issue #203): the counterweight dip machine, often the
-- same one as the assisted pull-up. It tracks {assistance,reps} like that one (074), so less help
-- is the record.
--
-- seed/exercise_catalog.json carries the same entry, without tracked_fields: this migration is
-- their source. No gif_key: the Gym Visual order behind 046 has no assisted dip.

WITH inserted AS (
    INSERT INTO exercises (name_es, name_en, muscle_group_id, equipment_type_id, tracked_fields, instructions, is_system)
    SELECT
        'Fondos asistidos en máquina',
        'Machine Assisted Dips',
        mg.id,
        4,
        '{assistance,reps}',
        '{"es":{"setup":"Selecciona el contrapeso de asistencia. Cuanto más peso, más te ayuda. Sube a la máquina, agarra las asas de fondos y apoya las rodillas en la plataforma con los brazos extendidos.","execution":"Baja despacio llevando los codos hacia atrás hasta que formen unos 90°. Empuja hasta extender los brazos sin bloquearlos de golpe.","cues":["Codos hacia atrás, no hacia fuera","Baja hasta unos 90° en los codos","Hombros abajo, lejos de las orejas"],"mistakes":["Encoger los hombros en la bajada","Dejarse impulsar por el contrapeso en la subida","Bajar demasiado sin movilidad suficiente"]},"en":{"setup":"Select the counterweight assistance. More weight means more help. Step onto the machine, grip the dip handles and kneel on the pad with your arms straight.","execution":"Lower slowly, driving your elbows back until they reach about 90°. Press up to full extension without snapping into lockout.","cues":["Elbows back, not flared out","Lower to about 90° at the elbows","Shoulders down, away from your ears"],"mistakes":["Shrugging on the way down","Letting the counterweight push you up","Going too deep without enough mobility"]}}'::jsonb,
        true
    FROM muscle_groups mg
    WHERE mg.name_es = 'Tríceps'
    RETURNING id
)
INSERT INTO exercise_secondary_muscles (exercise_id, muscle_group_id)
SELECT inserted.id, mg.id
FROM inserted
JOIN muscle_groups mg ON mg.name_es IN ('Pecho', 'Hombros');
