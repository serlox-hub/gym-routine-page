/**
 * Plantillas de rutinas predefinidas
 * Cada plantilla sigue el formato de importación JSON (versión 4)
 */

export const ROUTINE_TEMPLATES = [
  {
    id: 'ppl',
    name: 'Push Pull Legs (PPL)',
    description: '6 días/semana. División clásica para hipertrofia.',
    tags: ['Hipertrofia', '6 días'],
    data: {
      version: 4,
      exercises: [
        // Push
        { name: 'Press Banca', measurement_type: 'weight_reps', muscle_group_name: 'Pecho', weight_unit: 'kg' },
        { name: 'Press Inclinado Mancuernas', measurement_type: 'weight_reps', muscle_group_name: 'Pecho', weight_unit: 'kg' },
        { name: 'Aperturas en Polea', measurement_type: 'weight_reps', muscle_group_name: 'Pecho', weight_unit: 'kg' },
        { name: 'Press Militar', measurement_type: 'weight_reps', muscle_group_name: 'Hombros', weight_unit: 'kg' },
        { name: 'Elevaciones Laterales', measurement_type: 'weight_reps', muscle_group_name: 'Hombros', weight_unit: 'kg' },
        { name: 'Extensiones de Tríceps en Polea', measurement_type: 'weight_reps', muscle_group_name: 'Tríceps', weight_unit: 'kg' },
        { name: 'Fondos en Paralelas', measurement_type: 'weight_reps', muscle_group_name: 'Tríceps', weight_unit: 'kg' },
        // Pull
        { name: 'Dominadas', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Remo con Barra', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Jalón al Pecho', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Remo en Polea Baja', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Face Pull', measurement_type: 'weight_reps', muscle_group_name: 'Hombros', weight_unit: 'kg' },
        { name: 'Curl con Barra', measurement_type: 'weight_reps', muscle_group_name: 'Bíceps', weight_unit: 'kg' },
        { name: 'Curl Martillo', measurement_type: 'weight_reps', muscle_group_name: 'Bíceps', weight_unit: 'kg' },
        // Legs
        { name: 'Sentadilla', measurement_type: 'weight_reps', muscle_group_name: 'Cuádriceps', weight_unit: 'kg' },
        { name: 'Prensa de Piernas', measurement_type: 'weight_reps', muscle_group_name: 'Cuádriceps', weight_unit: 'kg' },
        { name: 'Extensión de Cuádriceps', measurement_type: 'weight_reps', muscle_group_name: 'Cuádriceps', weight_unit: 'kg' },
        { name: 'Peso Muerto Rumano', measurement_type: 'weight_reps', muscle_group_name: 'Isquiotibiales', weight_unit: 'kg' },
        { name: 'Curl Femoral', measurement_type: 'weight_reps', muscle_group_name: 'Isquiotibiales', weight_unit: 'kg' },
        { name: 'Elevación de Talones de Pie', measurement_type: 'weight_reps', muscle_group_name: 'Pantorrillas', weight_unit: 'kg' },
      ],
      routine: {
        name: 'Push Pull Legs',
        description: 'Rutina de 6 días dividida en empuje, tirón y piernas. Ideal para ganar masa muscular.',
        goal: 'Hipertrofia',
        days: [
          {
            name: 'Día 1 - Push',
            sort_order: 0,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Press Banca', series: 4, reps: '6-8', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Press Inclinado Mancuernas', series: 3, reps: '8-10', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Aperturas en Polea', series: 3, reps: '12-15', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Press Militar', series: 4, reps: '8-10', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Elevaciones Laterales', series: 3, reps: '12-15', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Extensiones de Tríceps en Polea', series: 3, reps: '10-12', rir: 1, rest_seconds: 60 },
                ]
              }
            ]
          },
          {
            name: 'Día 2 - Pull',
            sort_order: 1,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Dominadas', series: 4, reps: '6-8', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Remo con Barra', series: 4, reps: '6-8', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Jalón al Pecho', series: 3, reps: '10-12', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Remo en Polea Baja', series: 3, reps: '10-12', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Face Pull', series: 3, reps: '15-20', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Curl con Barra', series: 3, reps: '8-10', rir: 2, rest_seconds: 60 },
                  { exercise_name: 'Curl Martillo', series: 2, reps: '10-12', rir: 1, rest_seconds: 60 },
                ]
              }
            ]
          },
          {
            name: 'Día 3 - Legs',
            sort_order: 2,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Sentadilla', series: 4, reps: '6-8', rir: 2, rest_seconds: 180 },
                  { exercise_name: 'Prensa de Piernas', series: 3, reps: '10-12', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Extensión de Cuádriceps', series: 3, reps: '12-15', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Peso Muerto Rumano', series: 3, reps: '8-10', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Curl Femoral', series: 3, reps: '10-12', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Elevación de Talones de Pie', series: 4, reps: '12-15', rir: 1, rest_seconds: 60 },
                ]
              }
            ]
          },
          {
            name: 'Día 4 - Push',
            sort_order: 3,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Press Inclinado Mancuernas', series: 4, reps: '8-10', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Press Banca', series: 3, reps: '8-10', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Aperturas en Polea', series: 3, reps: '12-15', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Elevaciones Laterales', series: 4, reps: '12-15', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Press Militar', series: 3, reps: '10-12', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Fondos en Paralelas', series: 3, reps: '8-12', rir: 2, rest_seconds: 90 },
                ]
              }
            ]
          },
          {
            name: 'Día 5 - Pull',
            sort_order: 4,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Remo con Barra', series: 4, reps: '8-10', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Dominadas', series: 3, reps: '8-10', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Remo en Polea Baja', series: 3, reps: '10-12', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Jalón al Pecho', series: 3, reps: '12-15', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Face Pull', series: 3, reps: '15-20', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Curl Martillo', series: 3, reps: '10-12', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Curl con Barra', series: 2, reps: '10-12', rir: 1, rest_seconds: 60 },
                ]
              }
            ]
          },
          {
            name: 'Día 6 - Legs',
            sort_order: 5,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Peso Muerto Rumano', series: 4, reps: '6-8', rir: 2, rest_seconds: 180 },
                  { exercise_name: 'Sentadilla', series: 3, reps: '8-10', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Prensa de Piernas', series: 3, reps: '12-15', rir: 1, rest_seconds: 90 },
                  { exercise_name: 'Curl Femoral', series: 3, reps: '10-12', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Extensión de Cuádriceps', series: 3, reps: '12-15', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Elevación de Talones de Pie', series: 4, reps: '15-20', rir: 1, rest_seconds: 60 },
                ]
              }
            ]
          },
        ]
      }
    }
  },
  {
    id: 'upper-lower',
    name: 'Upper/Lower',
    description: '4 días/semana. Balance entre volumen y recuperación.',
    tags: ['Hipertrofia', '4 días'],
    data: {
      version: 4,
      exercises: [
        // Upper
        { name: 'Press Banca', measurement_type: 'weight_reps', muscle_group_name: 'Pecho', weight_unit: 'kg' },
        { name: 'Remo con Barra', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Press Militar', measurement_type: 'weight_reps', muscle_group_name: 'Hombros', weight_unit: 'kg' },
        { name: 'Jalón al Pecho', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Press Inclinado Mancuernas', measurement_type: 'weight_reps', muscle_group_name: 'Pecho', weight_unit: 'kg' },
        { name: 'Remo en Polea Baja', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Elevaciones Laterales', measurement_type: 'weight_reps', muscle_group_name: 'Hombros', weight_unit: 'kg' },
        { name: 'Face Pull', measurement_type: 'weight_reps', muscle_group_name: 'Hombros', weight_unit: 'kg' },
        { name: 'Curl con Barra', measurement_type: 'weight_reps', muscle_group_name: 'Bíceps', weight_unit: 'kg' },
        { name: 'Extensiones de Tríceps en Polea', measurement_type: 'weight_reps', muscle_group_name: 'Tríceps', weight_unit: 'kg' },
        // Lower
        { name: 'Sentadilla', measurement_type: 'weight_reps', muscle_group_name: 'Cuádriceps', weight_unit: 'kg' },
        { name: 'Peso Muerto Rumano', measurement_type: 'weight_reps', muscle_group_name: 'Isquiotibiales', weight_unit: 'kg' },
        { name: 'Prensa de Piernas', measurement_type: 'weight_reps', muscle_group_name: 'Cuádriceps', weight_unit: 'kg' },
        { name: 'Curl Femoral', measurement_type: 'weight_reps', muscle_group_name: 'Isquiotibiales', weight_unit: 'kg' },
        { name: 'Extensión de Cuádriceps', measurement_type: 'weight_reps', muscle_group_name: 'Cuádriceps', weight_unit: 'kg' },
        { name: 'Hip Thrust', measurement_type: 'weight_reps', muscle_group_name: 'Glúteos', weight_unit: 'kg' },
        { name: 'Elevación de Talones de Pie', measurement_type: 'weight_reps', muscle_group_name: 'Pantorrillas', weight_unit: 'kg' },
      ],
      routine: {
        name: 'Upper/Lower',
        description: 'Rutina de 4 días dividida en tren superior e inferior. Equilibrio entre volumen y recuperación.',
        goal: 'Hipertrofia',
        days: [
          {
            name: 'Día 1 - Upper (Fuerza)',
            sort_order: 0,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Press Banca', series: 4, reps: '5-6', rir: 2, rest_seconds: 180 },
                  { exercise_name: 'Remo con Barra', series: 4, reps: '5-6', rir: 2, rest_seconds: 180 },
                  { exercise_name: 'Press Militar', series: 3, reps: '6-8', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Jalón al Pecho', series: 3, reps: '8-10', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Curl con Barra', series: 2, reps: '8-10', rir: 2, rest_seconds: 60 },
                  { exercise_name: 'Extensiones de Tríceps en Polea', series: 2, reps: '10-12', rir: 1, rest_seconds: 60 },
                ]
              }
            ]
          },
          {
            name: 'Día 2 - Lower (Fuerza)',
            sort_order: 1,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Sentadilla', series: 4, reps: '5-6', rir: 2, rest_seconds: 180 },
                  { exercise_name: 'Peso Muerto Rumano', series: 4, reps: '6-8', rir: 2, rest_seconds: 150 },
                  { exercise_name: 'Prensa de Piernas', series: 3, reps: '8-10', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Curl Femoral', series: 3, reps: '10-12', rir: 1, rest_seconds: 90 },
                  { exercise_name: 'Elevación de Talones de Pie', series: 3, reps: '10-12', rir: 2, rest_seconds: 60 },
                ]
              }
            ]
          },
          {
            name: 'Día 3 - Upper (Volumen)',
            sort_order: 2,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Press Inclinado Mancuernas', series: 4, reps: '10-12', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Remo en Polea Baja', series: 4, reps: '10-12', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Elevaciones Laterales', series: 4, reps: '12-15', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Face Pull', series: 3, reps: '15-20', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Curl con Barra', series: 3, reps: '10-12', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Extensiones de Tríceps en Polea', series: 3, reps: '12-15', rir: 1, rest_seconds: 60 },
                ]
              }
            ]
          },
          {
            name: 'Día 4 - Lower (Volumen)',
            sort_order: 3,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Prensa de Piernas', series: 4, reps: '12-15', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Hip Thrust', series: 4, reps: '10-12', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Extensión de Cuádriceps', series: 3, reps: '12-15', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Curl Femoral', series: 3, reps: '12-15', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Elevación de Talones de Pie', series: 4, reps: '15-20', rir: 1, rest_seconds: 60 },
                ]
              }
            ]
          },
        ]
      }
    }
  },
  {
    id: 'full-body',
    name: 'Full Body',
    description: '3 días/semana. Ideal para principiantes o poco tiempo.',
    tags: ['General', '3 días'],
    data: {
      version: 4,
      exercises: [
        { name: 'Sentadilla', measurement_type: 'weight_reps', muscle_group_name: 'Cuádriceps', weight_unit: 'kg' },
        { name: 'Press Banca', measurement_type: 'weight_reps', muscle_group_name: 'Pecho', weight_unit: 'kg' },
        { name: 'Remo con Barra', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Press Militar', measurement_type: 'weight_reps', muscle_group_name: 'Hombros', weight_unit: 'kg' },
        { name: 'Peso Muerto Rumano', measurement_type: 'weight_reps', muscle_group_name: 'Isquiotibiales', weight_unit: 'kg' },
        { name: 'Jalón al Pecho', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Press Inclinado Mancuernas', measurement_type: 'weight_reps', muscle_group_name: 'Pecho', weight_unit: 'kg' },
        { name: 'Prensa de Piernas', measurement_type: 'weight_reps', muscle_group_name: 'Cuádriceps', weight_unit: 'kg' },
        { name: 'Dominadas', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Elevaciones Laterales', measurement_type: 'weight_reps', muscle_group_name: 'Hombros', weight_unit: 'kg' },
        { name: 'Curl con Barra', measurement_type: 'weight_reps', muscle_group_name: 'Bíceps', weight_unit: 'kg' },
        { name: 'Extensiones de Tríceps en Polea', measurement_type: 'weight_reps', muscle_group_name: 'Tríceps', weight_unit: 'kg' },
        { name: 'Plancha', measurement_type: 'time', muscle_group_name: 'Abdominales' },
      ],
      routine: {
        name: 'Full Body',
        description: 'Rutina de cuerpo completo 3 días por semana. Perfecta para principiantes o personas con poco tiempo.',
        goal: 'Acondicionamiento general',
        days: [
          {
            name: 'Día 1 - Full Body A',
            sort_order: 0,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Sentadilla', series: 3, reps: '8-10', rir: 2, rest_seconds: 150 },
                  { exercise_name: 'Press Banca', series: 3, reps: '8-10', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Remo con Barra', series: 3, reps: '8-10', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Press Militar', series: 3, reps: '10-12', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Curl con Barra', series: 2, reps: '10-12', rir: 2, rest_seconds: 60 },
                  { exercise_name: 'Plancha', series: 3, reps: '30s', rest_seconds: 60 },
                ]
              }
            ]
          },
          {
            name: 'Día 2 - Full Body B',
            sort_order: 1,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Peso Muerto Rumano', series: 3, reps: '8-10', rir: 2, rest_seconds: 150 },
                  { exercise_name: 'Press Inclinado Mancuernas', series: 3, reps: '10-12', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Jalón al Pecho', series: 3, reps: '10-12', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Elevaciones Laterales', series: 3, reps: '12-15', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Extensiones de Tríceps en Polea', series: 2, reps: '12-15', rir: 1, rest_seconds: 60 },
                  { exercise_name: 'Plancha', series: 3, reps: '30s', rest_seconds: 60 },
                ]
              }
            ]
          },
          {
            name: 'Día 3 - Full Body C',
            sort_order: 2,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Prensa de Piernas', series: 3, reps: '10-12', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Press Banca', series: 3, reps: '10-12', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Dominadas', series: 3, reps: '6-10', rir: 2, rest_seconds: 120 },
                  { exercise_name: 'Press Militar', series: 3, reps: '10-12', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Curl con Barra', series: 2, reps: '10-12', rir: 2, rest_seconds: 60 },
                  { exercise_name: 'Plancha', series: 3, reps: '30s', rest_seconds: 60 },
                ]
              }
            ]
          },
        ]
      }
    }
  },
  {
    id: '531',
    name: '5/3/1 Wendler',
    description: '4 días/semana. Programa de fuerza progresiva.',
    tags: ['Fuerza', '4 días'],
    data: {
      version: 4,
      exercises: [
        { name: 'Press Banca', measurement_type: 'weight_reps', muscle_group_name: 'Pecho', weight_unit: 'kg' },
        { name: 'Sentadilla', measurement_type: 'weight_reps', muscle_group_name: 'Cuádriceps', weight_unit: 'kg' },
        { name: 'Press Militar', measurement_type: 'weight_reps', muscle_group_name: 'Hombros', weight_unit: 'kg' },
        { name: 'Peso Muerto', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Press Inclinado Mancuernas', measurement_type: 'weight_reps', muscle_group_name: 'Pecho', weight_unit: 'kg' },
        { name: 'Remo con Barra', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Prensa de Piernas', measurement_type: 'weight_reps', muscle_group_name: 'Cuádriceps', weight_unit: 'kg' },
        { name: 'Curl Femoral', measurement_type: 'weight_reps', muscle_group_name: 'Isquiotibiales', weight_unit: 'kg' },
        { name: 'Elevaciones Laterales', measurement_type: 'weight_reps', muscle_group_name: 'Hombros', weight_unit: 'kg' },
        { name: 'Jalón al Pecho', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Dominadas', measurement_type: 'weight_reps', muscle_group_name: 'Espalda', weight_unit: 'kg' },
        { name: 'Fondos en Paralelas', measurement_type: 'weight_reps', muscle_group_name: 'Tríceps', weight_unit: 'kg' },
      ],
      routine: {
        name: '5/3/1 Wendler',
        description: 'Programa de fuerza basado en el método 5/3/1 de Jim Wendler. Progresión lenta pero constante.',
        goal: 'Fuerza',
        days: [
          {
            name: 'Día 1 - Press Banca',
            sort_order: 0,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Press Banca', series: 3, reps: '5/3/1', rir: 0, rest_seconds: 180, notes: 'Semana 1: 5-5-5+, Semana 2: 3-3-3+, Semana 3: 5-3-1+' },
                  { exercise_name: 'Press Banca', series: 5, reps: '10', rir: 2, rest_seconds: 90, notes: 'BBB: 5x10 al 50-60% del TM' },
                  { exercise_name: 'Remo con Barra', series: 5, reps: '10', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Press Inclinado Mancuernas', series: 3, reps: '10-12', rir: 2, rest_seconds: 60 },
                ]
              }
            ]
          },
          {
            name: 'Día 2 - Sentadilla',
            sort_order: 1,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Sentadilla', series: 3, reps: '5/3/1', rir: 0, rest_seconds: 180, notes: 'Semana 1: 5-5-5+, Semana 2: 3-3-3+, Semana 3: 5-3-1+' },
                  { exercise_name: 'Sentadilla', series: 5, reps: '10', rir: 2, rest_seconds: 120, notes: 'BBB: 5x10 al 50-60% del TM' },
                  { exercise_name: 'Curl Femoral', series: 4, reps: '10-12', rir: 2, rest_seconds: 60 },
                  { exercise_name: 'Prensa de Piernas', series: 3, reps: '12-15', rir: 2, rest_seconds: 90 },
                ]
              }
            ]
          },
          {
            name: 'Día 3 - Press Militar',
            sort_order: 2,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Press Militar', series: 3, reps: '5/3/1', rir: 0, rest_seconds: 180, notes: 'Semana 1: 5-5-5+, Semana 2: 3-3-3+, Semana 3: 5-3-1+' },
                  { exercise_name: 'Press Militar', series: 5, reps: '10', rir: 2, rest_seconds: 90, notes: 'BBB: 5x10 al 50-60% del TM' },
                  { exercise_name: 'Jalón al Pecho', series: 5, reps: '10', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Elevaciones Laterales', series: 4, reps: '12-15', rir: 1, rest_seconds: 60 },
                ]
              }
            ]
          },
          {
            name: 'Día 4 - Peso Muerto',
            sort_order: 3,
            estimated_duration_min: 60,
            blocks: [
              { name: 'Calentamiento', sort_order: 0, duration_min: 10, exercises: [] },
              {
                name: 'Principal', sort_order: 1, duration_min: 50,
                exercises: [
                  { exercise_name: 'Peso Muerto', series: 3, reps: '5/3/1', rir: 0, rest_seconds: 180, notes: 'Semana 1: 5-5-5+, Semana 2: 3-3-3+, Semana 3: 5-3-1+' },
                  { exercise_name: 'Peso Muerto', series: 5, reps: '10', rir: 2, rest_seconds: 120, notes: 'BBB: 5x10 al 50-60% del TM' },
                  { exercise_name: 'Dominadas', series: 5, reps: '8-10', rir: 2, rest_seconds: 90 },
                  { exercise_name: 'Fondos en Paralelas', series: 3, reps: '10-12', rir: 2, rest_seconds: 60 },
                ]
              }
            ]
          },
        ]
      }
    }
  },
]
