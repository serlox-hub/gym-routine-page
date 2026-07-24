/**
 * Plantillas de rutinas predefinidas.
 *
 * ACOPLADAS AL CATÁLOGO: todos los `exercise_name` DEBEN coincidir exactamente con un
 * `name_es` del catálogo de ejercicios del sistema (seed `exercise_catalog.json`). Si no
 * coinciden, `importRoutine` crea ejercicios *custom huérfanos* (sin GIF, instrucciones ni
 * grupo muscular). El test `routineTemplates.test.js` valida `plantilla ⊆ catálogo` y falla
 * en CI ante cualquier deriva → NO usar nombres genéricos, usar siempre el nombre canónico.
 *
 * Metadata estructurada (`goal`/`daysPerWeek`/`level`/`equipment`): la consume
 * `recommendTemplate` (onboarding, data-driven) y `getTemplateDisplay` (tags i18n).
 *
 * Nombres/descripciones son i18n (`routine:templates.items.<id>.*`) — ver getTemplateDisplay
 * (picker) y getTemplateImportData (localiza el nombre/descr. de la rutina al instanciarla).
 * El fallback estático `data.routine.name/description` está en español por si se importa
 * `template.data` sin pasar por el helper.
 */
import { BLOCK_NAMES } from './constants.js'
import { GOAL_VALUES, GOAL_OPTIONS } from './routineWizardOptions.js'

// Nombres canónicos del catálogo usados por las plantillas (fuente única para evitar typos)
const E = {
  benchBB: 'Press de banca con barra',
  benchDB: 'Press de banca con mancuernas',
  inclineDB: 'Press inclinado con mancuernas',
  pecDeck: 'Aperturas en máquina pec deck',
  cableFlyHigh: 'Cruce de poleas alto',
  chestMachine: 'Press de pecho en máquina',
  dipsParallel: 'Fondos en paralelas',
  dipsBench: 'Fondos en banco',
  pushup: 'Flexiones',
  pushupIncline: 'Flexiones inclinadas',
  pushupDecline: 'Flexiones declinadas',
  pushupDiamond: 'Flexiones diamante',
  pullup: 'Dominadas',
  chinup: 'Dominadas agarre supino',
  latPronate: 'Jalón al pecho agarre prono',
  rowBB: 'Remo con barra agarre prono',
  rowDB1: 'Remo con mancuerna a una mano',
  seatedCableRow: 'Remo en polea baja sentado',
  invRow: 'Remo invertido en barra',
  deadlift: 'Peso muerto convencional',
  rdlBB: 'Peso muerto rumano con barra',
  hyperext: 'Hiperextensiones',
  shrugDB: 'Encogimientos con mancuernas',
  facePull: 'Face pull en polea',
  ohpBB: 'Press militar con barra de pie',
  shoulderPressDB: 'Press de hombros con mancuernas sentado',
  lateralRaiseDB: 'Elevaciones laterales con mancuernas',
  frontRaiseDB: 'Elevaciones frontales con mancuernas',
  rearDeltDB: 'Pájaros con mancuernas',
  curlBB: 'Curl con barra recta',
  curlDBalt: 'Curl con mancuernas alterno',
  hammerDB: 'Curl martillo con mancuernas',
  preacherEZ: 'Curl en banco predicador con barra EZ',
  pushdownBar: 'Extensión de tríceps en polea con barra recta',
  pushdownRope: 'Extensión de tríceps en polea con cuerda',
  frenchEZ: 'Press francés con barra EZ',
  squatBB: 'Sentadilla con barra alta',
  gobletSquat: 'Sentadilla goblet con mancuerna',
  bwSquat: 'Sentadilla con peso corporal',
  jumpSquat: 'Sentadilla con salto',
  pistolSquat: 'Sentadilla pistol',
  legPress: 'Prensa de piernas inclinada',
  legExt: 'Extensión de cuádriceps en máquina',
  walkingLunge: 'Zancadas caminando',
  legCurlLying: 'Curl femoral tumbado en máquina',
  legCurlSeated: 'Curl femoral sentado en máquina',
  hipThrustBB: 'Hip thrust con barra',
  hipThrustUni: 'Hip thrust unilateral',
  gluteBridge: 'Puente de glúteos',
  calfStanding: 'Elevación de talones de pie en máquina',
  calfSeated: 'Elevación de talones sentado en máquina',
  plank: 'Plancha frontal',
  crunch: 'Crunch en suelo',
  hangingLegRaise: 'Elevación de piernas colgado',
  hollowHold: 'Hollow hold',
  mountainClimbers: 'Mountain climbers',
  bicycleCrunch: 'Crunch bicicleta',
  // Mancuernas (rutina en casa)
  rdlDB: 'Peso muerto rumano con mancuernas',
  bulgarianDB: 'Sentadilla búlgara con mancuernas',
  ohTricepDB: 'Extensión de tríceps con mancuerna sobre cabeza',
  lungeDB: 'Zancadas con mancuernas',
  flyDB: 'Aperturas con mancuernas',
  inclineRowDB: 'Remo con mancuernas en banco inclinado',
  hipThrustDB: 'Hip thrust con mancuerna',
  calfDB: 'Elevación de talones de pie con mancuerna',
}

const BBB_NOTE = 'BBB: 5x10 al 50-60% del TM'
const WENDLER_NOTE = 'Semana 1: 5-5-5+, Semana 2: 3-3-3+, Semana 3: 5-3-1+'

// e(name, series, reps, rir, rest, notes) — helper compacto para definir ejercicios
function e(name, series, reps, rir, rest, notes) {
  return { exercise_name: name, series, reps, rir: rir ?? null, rest_seconds: rest, notes: notes ?? null }
}

/**
 * Construye el objeto plantilla. `data.exercises` se DERIVA de los ejercicios de los días
 * (solo `name_es`): al coincidir con el catálogo, importRoutine los enlaza por nombre y
 * hereda measurement_type/grupo muscular/GIF del ejercicio del sistema.
 */
function makeTemplate({ id, goal, daysPerWeek, level, equipment = 'full', name, description, days }) {
  const exerciseNames = new Set()
  const builtDays = days.map((d, i) => {
    const blocks = [{
      name: BLOCK_NAMES.MAIN,
      sort_order: 1,
      duration_min: null,
      exercises: d.main.map(ex => { exerciseNames.add(ex.exercise_name); return ex }),
    }]
    return { name: d.name, sort_order: i, estimated_duration_min: d.durationMin ?? 60, blocks }
  })
  return {
    id, goal, daysPerWeek, level, equipment,
    data: {
      // v5: las plantillas solo llevan name_es (no el name_en opcional de v6). Es decorativo:
      // importRoutine ignora `version` y casa por nombre (ver exerciseMatch / DECISIONS).
      version: 5,
      exercises: [...exerciseNames].map(n => ({ name_es: n })),
      routine: { name, description, days: builtDays },
    },
  }
}

export const ROUTINE_TEMPLATES = [
  makeTemplate({
    id: 'full-body-2', goal: GOAL_VALUES.GENERAL, daysPerWeek: 2, level: 'beginner',
    name: 'Full Body 2 días', description: 'Cuerpo completo 2 días/semana. Mínimo tiempo, máximo básico.',
    days: [
      { name: 'Día 1 - Full Body A', durationMin: 70, main: [
        e(E.squatBB, 3, '8-10', 2, 150), e(E.benchBB, 3, '8-10', 2, 120), e(E.rowBB, 3, '8-10', 2, 120),
        e(E.lateralRaiseDB, 3, '12-15', 1, 60), e(E.plank, 3, '30-45s', null, 60),
      ] },
      { name: 'Día 2 - Full Body B', durationMin: 70, main: [
        e(E.rdlBB, 3, '8-10', 2, 150), e(E.shoulderPressDB, 3, '10-12', 2, 90), e(E.latPronate, 3, '10-12', 2, 90),
        e(E.legPress, 3, '12-15', 1, 90), e(E.curlBB, 2, '10-12', 2, 60), e(E.crunch, 3, '15-20', null, 60),
      ] },
    ],
  }),
  makeTemplate({
    id: 'full-body', goal: GOAL_VALUES.GENERAL, daysPerWeek: 3, level: 'beginner',
    name: 'Full Body', description: 'Cuerpo completo 3 días/semana. Ideal para empezar.',
    days: [
      { name: 'Día 1 - Full Body A', main: [
        e(E.squatBB, 3, '8-10', 2, 150), e(E.benchBB, 3, '8-10', 2, 120), e(E.rowBB, 3, '8-10', 2, 120),
        e(E.ohpBB, 3, '10-12', 2, 90), e(E.curlBB, 2, '10-12', 2, 60), e(E.plank, 3, '30-45s', null, 60),
      ] },
      { name: 'Día 2 - Full Body B', main: [
        e(E.rdlBB, 3, '8-10', 2, 150), e(E.inclineDB, 3, '10-12', 2, 90), e(E.latPronate, 3, '10-12', 2, 90),
        e(E.lateralRaiseDB, 3, '12-15', 1, 60), e(E.pushdownRope, 2, '12-15', 1, 60), e(E.crunch, 3, '15-20', null, 60),
      ] },
      { name: 'Día 3 - Full Body C', main: [
        e(E.legPress, 3, '10-12', 2, 120), e(E.benchDB, 3, '10-12', 2, 90), e(E.pullup, 3, '6-10', 2, 120),
        e(E.shoulderPressDB, 3, '10-12', 2, 90), e(E.hammerDB, 2, '10-12', 1, 60), e(E.plank, 3, '30-45s', null, 60),
      ] },
    ],
  }),
  makeTemplate({
    id: 'ppl-3', goal: GOAL_VALUES.HYPERTROPHY, daysPerWeek: 3, level: 'intermediate',
    name: 'Push Pull Legs (3 días)', description: 'Empuje / tirón / pierna a frecuencia 1×. Buen salto desde full body.',
    days: [
      { name: 'Día 1 - Push', main: [
        e(E.benchBB, 4, '6-8', 2, 120), e(E.shoulderPressDB, 3, '8-10', 2, 90), e(E.inclineDB, 3, '10-12', 2, 90),
        e(E.lateralRaiseDB, 3, '12-15', 1, 60), e(E.pushdownRope, 3, '10-12', 1, 60),
      ] },
      { name: 'Día 2 - Pull', main: [
        e(E.pullup, 4, '6-8', 2, 120), e(E.rowBB, 4, '8-10', 2, 120), e(E.latPronate, 3, '10-12', 2, 90),
        e(E.facePull, 3, '15-20', 1, 60), e(E.curlBB, 3, '10-12', 1, 60),
      ] },
      { name: 'Día 3 - Legs', main: [
        e(E.squatBB, 4, '6-8', 2, 180), e(E.rdlBB, 3, '8-10', 2, 120), e(E.legPress, 3, '12-15', 1, 90),
        e(E.legCurlLying, 3, '10-12', 1, 60), e(E.calfStanding, 4, '12-15', 1, 60),
      ] },
    ],
  }),
  makeTemplate({
    id: 'upper-lower', goal: GOAL_VALUES.HYPERTROPHY, daysPerWeek: 4, level: 'intermediate',
    name: 'Upper / Lower', description: '4 días dividido en tren superior e inferior. Volumen y recuperación equilibrados.',
    days: [
      { name: 'Día 1 - Upper (Fuerza)', main: [
        e(E.benchBB, 4, '5-6', 2, 180), e(E.rowBB, 4, '5-6', 2, 180), e(E.ohpBB, 3, '6-8', 2, 120),
        e(E.latPronate, 3, '8-10', 2, 90), e(E.curlBB, 2, '8-10', 2, 60), e(E.pushdownBar, 2, '10-12', 1, 60),
      ] },
      { name: 'Día 2 - Lower (Fuerza)', main: [
        e(E.squatBB, 4, '5-6', 2, 180), e(E.rdlBB, 4, '6-8', 2, 150), e(E.legPress, 3, '8-10', 2, 120),
        e(E.legCurlLying, 3, '10-12', 1, 90), e(E.calfStanding, 3, '10-12', 2, 60),
      ] },
      { name: 'Día 3 - Upper (Volumen)', main: [
        e(E.inclineDB, 4, '10-12', 2, 90), e(E.seatedCableRow, 4, '10-12', 2, 90), e(E.lateralRaiseDB, 4, '12-15', 1, 60),
        e(E.facePull, 3, '15-20', 1, 60), e(E.curlDBalt, 3, '10-12', 1, 60), e(E.pushdownRope, 3, '12-15', 1, 60),
      ] },
      { name: 'Día 4 - Lower (Volumen)', main: [
        e(E.legPress, 4, '12-15', 2, 90), e(E.hipThrustBB, 4, '10-12', 2, 90), e(E.legExt, 3, '12-15', 1, 60),
        e(E.legCurlSeated, 3, '12-15', 1, 60), e(E.calfSeated, 4, '15-20', 1, 60),
      ] },
    ],
  }),
  makeTemplate({
    id: '531', goal: GOAL_VALUES.STRENGTH, daysPerWeek: 4, level: 'intermediate',
    name: '5/3/1 Wendler', description: 'Fuerza progresiva 4 días (método 5/3/1 + BBB). Progreso lento y constante.',
    days: [
      { name: 'Día 1 - Press Banca', main: [
        e(E.benchBB, 3, '5/3/1', 0, 180, WENDLER_NOTE), e(E.benchBB, 5, '10', 2, 90, BBB_NOTE),
        e(E.rowBB, 5, '10', 2, 90), e(E.inclineDB, 3, '10-12', 2, 60),
      ] },
      { name: 'Día 2 - Sentadilla', main: [
        e(E.squatBB, 3, '5/3/1', 0, 180, WENDLER_NOTE), e(E.squatBB, 5, '10', 2, 120, BBB_NOTE),
        e(E.legCurlLying, 4, '10-12', 2, 60), e(E.legPress, 3, '12-15', 2, 90),
      ] },
      { name: 'Día 3 - Press Militar', main: [
        e(E.ohpBB, 3, '5/3/1', 0, 180, WENDLER_NOTE), e(E.ohpBB, 5, '10', 2, 90, BBB_NOTE),
        e(E.latPronate, 5, '10', 2, 90), e(E.lateralRaiseDB, 4, '12-15', 1, 60),
      ] },
      { name: 'Día 4 - Peso Muerto', main: [
        e(E.deadlift, 3, '5/3/1', 0, 180, WENDLER_NOTE), e(E.deadlift, 5, '10', 2, 120, BBB_NOTE),
        e(E.pullup, 5, '8-10', 2, 90), e(E.dipsParallel, 3, '10-12', 2, 60),
      ] },
    ],
  }),
  makeTemplate({
    id: 'weider-5', goal: GOAL_VALUES.HYPERTROPHY, daysPerWeek: 5, level: 'advanced',
    name: 'Split Weider (5 días)', description: 'Un grupo muscular por día. Máxima frecuencia de asistencia y volumen por grupo.',
    days: [
      { name: 'Día 1 - Pecho', main: [
        e(E.benchBB, 4, '6-8', 2, 120), e(E.inclineDB, 4, '8-10', 2, 90), e(E.pecDeck, 3, '12-15', 1, 60),
        e(E.cableFlyHigh, 3, '12-15', 1, 60), e(E.dipsParallel, 3, '8-12', 2, 90),
      ] },
      { name: 'Día 2 - Espalda', main: [
        e(E.pullup, 4, '6-10', 2, 120), e(E.rowBB, 4, '8-10', 2, 120), e(E.latPronate, 3, '10-12', 2, 90),
        e(E.seatedCableRow, 3, '10-12', 2, 90), e(E.facePull, 3, '15-20', 1, 60),
      ] },
      { name: 'Día 3 - Pierna', main: [
        e(E.squatBB, 4, '6-8', 2, 180), e(E.legPress, 4, '10-12', 2, 120), e(E.legCurlLying, 3, '10-12', 1, 90),
        e(E.legExt, 3, '12-15', 1, 60), e(E.calfStanding, 4, '12-15', 1, 60),
      ] },
      { name: 'Día 4 - Hombro', main: [
        e(E.ohpBB, 4, '8-10', 2, 120), e(E.lateralRaiseDB, 4, '12-15', 1, 60), e(E.rearDeltDB, 3, '15-20', 1, 60),
        e(E.frontRaiseDB, 3, '12-15', 1, 60), e(E.shrugDB, 3, '12-15', 1, 60),
      ] },
      { name: 'Día 5 - Brazo', main: [
        e(E.curlBB, 4, '8-10', 2, 60), e(E.pushdownBar, 4, '10-12', 1, 60), e(E.hammerDB, 3, '10-12', 1, 60),
        e(E.frenchEZ, 3, '10-12', 1, 60), e(E.preacherEZ, 3, '12-15', 1, 60),
      ] },
    ],
  }),
  makeTemplate({
    id: 'ppl', goal: GOAL_VALUES.HYPERTROPHY, daysPerWeek: 6, level: 'advanced',
    name: 'Push Pull Legs (PPL)', description: '6 días empuje/tirón/pierna a frecuencia 2×. Máximo volumen para hipertrofia.',
    days: [
      { name: 'Día 1 - Push', main: [
        e(E.benchBB, 4, '6-8', 2, 120), e(E.inclineDB, 3, '8-10', 2, 90), e(E.cableFlyHigh, 3, '12-15', 1, 60),
        e(E.ohpBB, 4, '8-10', 2, 90), e(E.lateralRaiseDB, 3, '12-15', 1, 60), e(E.pushdownBar, 3, '10-12', 1, 60),
      ] },
      { name: 'Día 2 - Pull', main: [
        e(E.pullup, 4, '6-8', 2, 120), e(E.rowBB, 4, '6-8', 2, 120), e(E.latPronate, 3, '10-12', 2, 90),
        e(E.seatedCableRow, 3, '10-12', 2, 90), e(E.facePull, 3, '15-20', 1, 60), e(E.curlBB, 3, '8-10', 2, 60),
      ] },
      { name: 'Día 3 - Legs', main: [
        e(E.squatBB, 4, '6-8', 2, 180), e(E.legPress, 3, '10-12', 2, 120), e(E.legExt, 3, '12-15', 1, 60),
        e(E.rdlBB, 3, '8-10', 2, 120), e(E.legCurlLying, 3, '10-12', 1, 60), e(E.calfStanding, 4, '12-15', 1, 60),
      ] },
      { name: 'Día 4 - Push', main: [
        e(E.inclineDB, 4, '8-10', 2, 90), e(E.benchBB, 3, '8-10', 2, 90), e(E.pecDeck, 3, '12-15', 1, 60),
        e(E.lateralRaiseDB, 4, '12-15', 1, 60), e(E.shoulderPressDB, 3, '10-12', 2, 90), e(E.dipsParallel, 3, '8-12', 2, 90),
      ] },
      { name: 'Día 5 - Pull', main: [
        e(E.rowBB, 4, '8-10', 2, 120), e(E.pullup, 3, '8-10', 2, 120), e(E.seatedCableRow, 3, '10-12', 2, 90),
        e(E.latPronate, 3, '12-15', 1, 60), e(E.facePull, 3, '15-20', 1, 60), e(E.hammerDB, 3, '10-12', 1, 60),
      ] },
      { name: 'Día 6 - Legs', main: [
        e(E.rdlBB, 4, '6-8', 2, 180), e(E.squatBB, 3, '8-10', 2, 120), e(E.legPress, 3, '12-15', 1, 90),
        e(E.legCurlSeated, 3, '10-12', 1, 60), e(E.legExt, 3, '12-15', 1, 60), e(E.calfSeated, 4, '15-20', 1, 60),
      ] },
    ],
  }),
  makeTemplate({
    id: 'home-bodyweight', goal: GOAL_VALUES.GENERAL, daysPerWeek: 3, level: 'beginner', equipment: 'bodyweight',
    name: 'En casa (peso corporal)', description: 'Sin equipo de gimnasio. Cuerpo completo con tu propio peso, 3 días/semana.',
    days: [
      { name: 'Día 1 - Full Body A', main: [
        e(E.bwSquat, 3, '15-20', null, 60), e(E.pushup, 3, '8-15', 2, 60), e(E.invRow, 3, '8-12', 2, 60),
        e(E.walkingLunge, 3, '12', null, 60), e(E.plank, 3, '30-45s', null, 60),
      ] },
      { name: 'Día 2 - Full Body B', main: [
        e(E.jumpSquat, 3, '12-15', null, 75), e(E.pushupDecline, 3, '8-12', 2, 60), e(E.chinup, 3, '5-10', 2, 90),
        e(E.hipThrustUni, 3, '12', null, 60), e(E.hollowHold, 3, '20-30s', null, 60),
      ] },
      { name: 'Día 3 - Full Body C', main: [
        e(E.pistolSquat, 3, '5-8', 2, 75), e(E.dipsBench, 3, '8-15', 2, 60), e(E.invRow, 3, '8-12', 2, 60),
        e(E.gluteBridge, 3, '15-20', null, 45), e(E.mountainClimbers, 3, '30-40', null, 45),
      ] },
    ],
  }),
  makeTemplate({
    id: 'strength-5x5', goal: GOAL_VALUES.STRENGTH, daysPerWeek: 3, level: 'beginner',
    name: 'Fuerza 5x5', description: 'Fuerza para principiantes: 5x5 en los básicos, 3 días, progresión lineal.',
    days: [
      { name: 'Día 1 - Fuerza A', main: [
        e(E.squatBB, 5, '5', 1, 180), e(E.benchBB, 5, '5', 1, 180), e(E.rowBB, 5, '5', 1, 180),
      ] },
      { name: 'Día 2 - Fuerza B', main: [
        e(E.squatBB, 5, '5', 1, 180), e(E.ohpBB, 5, '5', 1, 180), e(E.deadlift, 1, '5', 1, 180, 'Una sola serie pesada'),
      ] },
      { name: 'Día 3 - Fuerza A', main: [
        e(E.squatBB, 5, '5', 1, 180), e(E.benchBB, 5, '5', 1, 180), e(E.rowBB, 5, '5', 1, 180),
      ] },
    ],
  }),
  makeTemplate({
    id: 'strength-hf', goal: GOAL_VALUES.STRENGTH, daysPerWeek: 5, level: 'advanced',
    name: 'Fuerza alta frecuencia', description: 'Fuerza para avanzados, 5 días con foco rotatorio en los básicos pesados + accesorios.',
    days: [
      { name: 'Día 1 - Sentadilla', main: [
        e(E.squatBB, 5, '3', 1, 210, 'Series pesadas'), e(E.legPress, 3, '8', 2, 120), e(E.legCurlLying, 3, '10', 2, 90), e(E.plank, 3, '45-60s', null, 60),
      ] },
      { name: 'Día 2 - Press Banca', main: [
        e(E.benchBB, 5, '3', 1, 210, 'Series pesadas'), e(E.inclineDB, 3, '8', 2, 90), e(E.dipsParallel, 3, '8-10', 2, 90), e(E.pushdownBar, 3, '10-12', 1, 60),
      ] },
      { name: 'Día 3 - Peso Muerto', main: [
        e(E.deadlift, 5, '3', 1, 210, 'Series pesadas'), e(E.rowBB, 4, '6', 2, 120), e(E.latPronate, 3, '8-10', 2, 90), e(E.curlBB, 3, '10', 1, 60),
      ] },
      { name: 'Día 4 - Press Militar', main: [
        e(E.ohpBB, 5, '3', 1, 210, 'Series pesadas'), e(E.shoulderPressDB, 3, '8', 2, 90), e(E.lateralRaiseDB, 3, '12-15', 1, 60), e(E.facePull, 3, '15', 1, 60),
      ] },
      { name: 'Día 5 - Volumen', main: [
        e(E.squatBB, 4, '5', 2, 150), e(E.benchBB, 4, '5', 2, 150), e(E.rowBB, 4, '6', 2, 120), e(E.calfStanding, 4, '12-15', 1, 60),
      ] },
    ],
  }),
  makeTemplate({
    id: 'endurance-circuit', goal: GOAL_VALUES.ENDURANCE, daysPerWeek: 3, level: 'beginner',
    name: 'Resistencia (circuito)', description: 'Cuerpo completo en circuito: reps altas y descansos cortos, 3 días. Para resistencia muscular.',
    days: [
      { name: 'Día 1 - Circuito A', main: [
        e(E.legPress, 3, '15-20', 2, 45), e(E.chestMachine, 3, '15-20', 2, 45), e(E.seatedCableRow, 3, '15-20', 2, 45),
        e(E.lateralRaiseDB, 3, '15-20', 2, 30), e(E.crunch, 3, '20', 2, 30), e(E.mountainClimbers, 3, '40', null, 30),
      ] },
      { name: 'Día 2 - Circuito B', main: [
        e(E.gobletSquat, 3, '15-20', 2, 45), e(E.latPronate, 3, '15-20', 2, 45), e(E.shoulderPressDB, 3, '15-20', 2, 45),
        e(E.legCurlSeated, 3, '15-20', 2, 30), e(E.plank, 3, '45-60s', null, 30), e(E.calfStanding, 3, '20', 2, 30),
      ] },
      { name: 'Día 3 - Circuito C', main: [
        e(E.walkingLunge, 3, '20', 2, 45), e(E.pecDeck, 3, '15-20', 2, 30), e(E.facePull, 3, '20', 2, 30),
        e(E.hipThrustBB, 3, '15-20', 2, 45), e(E.bicycleCrunch, 3, '40', null, 30), e(E.pushdownRope, 3, '15-20', 2, 30),
      ] },
    ],
  }),
  makeTemplate({
    id: 'home-dumbbell', goal: GOAL_VALUES.GENERAL, daysPerWeek: 3, level: 'beginner', equipment: 'dumbbell',
    name: 'En casa con mancuernas', description: 'Cuerpo completo solo con mancuernas, 3 días. Ideal para gimnasio en casa.',
    days: [
      { name: 'Día 1 - Full Body A', main: [
        e(E.gobletSquat, 3, '10-12', 2, 90), e(E.benchDB, 3, '10-12', 2, 90), e(E.rowDB1, 3, '10-12', 2, 90),
        e(E.shoulderPressDB, 3, '10-12', 2, 90), e(E.curlDBalt, 2, '10-12', 1, 60), e(E.plank, 3, '30-45s', null, 60),
      ] },
      { name: 'Día 2 - Full Body B', main: [
        e(E.rdlDB, 3, '10-12', 2, 90), e(E.inclineDB, 3, '10-12', 2, 90), e(E.bulgarianDB, 3, '10-12', 2, 75),
        e(E.lateralRaiseDB, 3, '12-15', 1, 60), e(E.ohTricepDB, 2, '10-12', 1, 60), e(E.crunch, 3, '15-20', null, 60),
      ] },
      { name: 'Día 3 - Full Body C', main: [
        e(E.lungeDB, 3, '12', 2, 75), e(E.flyDB, 3, '12-15', 1, 60), e(E.inclineRowDB, 3, '10-12', 2, 90),
        e(E.hipThrustDB, 3, '10-12', 2, 75), e(E.hammerDB, 2, '10-12', 1, 60), e(E.calfDB, 3, '12-15', 1, 60),
      ] },
    ],
  }),
]

// ============================================
// DISPLAY / INSTANCIACIÓN (i18n)
// ============================================

// goal (GOAL_VALUES) -> clave de etiqueta corta para el tag del picker
const GOAL_TAG_KEY = {
  [GOAL_VALUES.HYPERTROPHY]: 'routine:templates.goalTags.hypertrophy',
  [GOAL_VALUES.STRENGTH]: 'routine:templates.goalTags.strength',
  [GOAL_VALUES.ENDURANCE]: 'routine:templates.goalTags.endurance',
  [GOAL_VALUES.GENERAL]: 'routine:templates.goalTags.general',
}

// equipment -> clave de etiqueta de equipo (solo para equipos no-gimnasio)
const EQUIPMENT_TAG_KEY = {
  bodyweight: 'routine:templates.tagBodyweight',
  dumbbell: 'routine:templates.tagDumbbell',
}

/**
 * Strings de presentación de una plantilla para el selector (nombre, descripción, tags).
 * Recibe `t` (de useTranslation en componentes) para que reaccione al cambio de idioma en vivo.
 * @returns {{ name: string, description: string, tags: string[] }}
 */
export function getTemplateDisplay(template, t) {
  const goalTagKey = GOAL_TAG_KEY[template.goal]
  const goalOption = GOAL_OPTIONS.find(o => o.value === template.goal)
  const tags = [
    goalTagKey ? t(goalTagKey) : (goalOption ? t(goalOption.labelKey) : template.goal),
    t('common:home.nDays', { count: template.daysPerWeek }),
  ]
  const equipmentTagKey = EQUIPMENT_TAG_KEY[template.equipment]
  if (equipmentTagKey) tags.push(t(equipmentTagKey))
  return {
    name: t(`routine:templates.items.${template.id}.name`),
    description: t(`routine:templates.items.${template.id}.description`),
    tags,
  }
}

/**
 * Datos de importación de una plantilla con el nombre/descripción de la rutina localizados,
 * para que la rutina creada quede en el idioma del usuario (coherente con el picker).
 */
export function getTemplateImportData(template, t) {
  return {
    ...template.data,
    routine: {
      ...template.data.routine,
      name: t(`routine:templates.items.${template.id}.name`),
      description: t(`routine:templates.items.${template.id}.description`),
    },
  }
}
