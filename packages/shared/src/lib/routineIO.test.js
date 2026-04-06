import { describe, it, expect } from 'vitest'
import { buildChatbotPrompt, buildAdaptRoutinePrompt, ROUTINE_JSON_FORMAT, ROUTINE_JSON_RULES } from './routineIO.js'

describe('routineIO - funciones puras (shared)', () => {
  describe('buildChatbotPrompt', () => {
    it('genera prompt con todos los campos completos', () => {
      const params = {
        objetivo: 'Hipertrofia',
        diasPorSemana: '4',
        nivelExperiencia: 'Intermedio',
        duracionSesion: '60',
        equipamiento: 'Gimnasio completo',
        notas: 'Sin lesiones'
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('Hipertrofia')
      expect(prompt).toContain('4')
      expect(prompt).toContain('Intermedio')
      expect(prompt).toContain('60')
      expect(prompt).toContain('Gimnasio completo')
      expect(prompt).toContain('Sin lesiones')
    })

    it('genera prompt solo con campos obligatorios', () => {
      const params = {
        objetivo: 'Fuerza',
        diasPorSemana: '3',
        nivelExperiencia: '',
        duracionSesion: '',
        equipamiento: '',
        notas: ''
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('Fuerza')
      expect(prompt).toContain('3')
    })

    it('genera prompt con campos undefined/null', () => {
      const params = {
        objetivo: 'Resistencia',
        diasPorSemana: '5',
        nivelExperiencia: null,
        duracionSesion: undefined,
        equipamiento: null,
        notas: undefined
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('Resistencia')
      expect(prompt).toContain('5')
      expect(prompt).not.toContain('null')
      expect(prompt).not.toContain('undefined')
    })

    it('el formato JSON usa placeholder para goal', () => {
      const params = {
        objetivo: 'Hipertrofia',
        diasPorSemana: '2'
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('"goal"')
      expect(prompt).toContain('Hipertrofia')
    })

    it('incluye estructura JSON correcta en el prompt', () => {
      const params = {
        objetivo: 'Hipertrofia',
        diasPorSemana: '4'
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('"version": 5')
      expect(prompt).toContain('"exercises":')
      expect(prompt).toContain('"routine":')
      expect(prompt).toContain('"measurement_type"')
      expect(prompt).toContain('"muscle_group_name"')
      expect(prompt).toContain('JSON')
    })

    it('incluye instrucciones para el chatbot', () => {
      const params = {
        objetivo: 'Fuerza',
        diasPorSemana: '3'
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('entrenador personal certificado')
      expect(prompt).toContain('CRITERIOS DE DISEÑO')
    })
  })

  describe('buildAdaptRoutinePrompt', () => {
    it('genera prompt para adaptar rutina existente', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).toContain('rutina de entrenamiento')
      expect(prompt).toContain('MI RUTINA A CONVERTIR:')
    })

    it('incluye el formato JSON compartido', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).toContain('"version": 5')
      expect(prompt).toContain('"exercises":')
      expect(prompt).toContain('"routine":')
      expect(prompt).toContain('"duration_min"')
    })

    it('incluye las reglas compartidas', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).toContain('IMPORTANT RULES')
      expect(prompt).toContain('EXERCISE FIELDS')
      expect(prompt).toContain('BLOCK FIELDS')
    })

    it('no incluye tipos de medición obsoletos', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).not.toContain('reps_per_side')
      expect(prompt).not.toContain('time_per_side')
    })

    it('incluye solo los 4 tipos de medición válidos', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).toContain('"weight_reps"')
      expect(prompt).toContain('"reps_only"')
      expect(prompt).toContain('"time"')
      expect(prompt).toContain('"distance"')
    })
  })

  describe('constantes compartidas', () => {
    it('ROUTINE_JSON_FORMAT contiene estructura válida', () => {
      expect(ROUTINE_JSON_FORMAT).toContain('"version": 5')
      expect(ROUTINE_JSON_FORMAT).toContain('"exercises"')
      expect(ROUTINE_JSON_FORMAT).toContain('"routine"')
      expect(ROUTINE_JSON_FORMAT).toContain('"duration_min"')
    })

    it('ROUTINE_JSON_RULES contiene documentación de campos', () => {
      expect(ROUTINE_JSON_RULES).toContain('IMPORTANT RULES')
      expect(ROUTINE_JSON_RULES).toContain('EXERCISE FIELDS')
      expect(ROUTINE_JSON_RULES).toContain('measurement_type')
      expect(ROUTINE_JSON_RULES).toContain('muscle_group_name')
    })

    it('ROUTINE_JSON_RULES no contiene tipos obsoletos', () => {
      expect(ROUTINE_JSON_RULES).not.toContain('reps_per_side')
      expect(ROUTINE_JSON_RULES).not.toContain('time_per_side')
    })

    it('ambos prompts usan las mismas constantes', () => {
      const chatbotPrompt = buildChatbotPrompt({ objetivo: 'Test', diasPorSemana: '3' })
      const adaptPrompt = buildAdaptRoutinePrompt()

      expect(chatbotPrompt).toContain('EXERCISE FIELDS')
      expect(adaptPrompt).toContain('EXERCISE FIELDS')
    })
  })
})
