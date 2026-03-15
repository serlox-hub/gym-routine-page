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

      expect(prompt).toContain('- Objetivo: Hipertrofia')
      expect(prompt).toContain('- Días por semana: 4')
      expect(prompt).toContain('- Nivel de experiencia: Intermedio')
      expect(prompt).toContain('- Duración por sesión: 60 minutos')
      expect(prompt).toContain('- Equipamiento disponible: Gimnasio completo')
      expect(prompt).toContain('- Notas adicionales: Sin lesiones')
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

      expect(prompt).toContain('- Objetivo: Fuerza')
      expect(prompt).toContain('- Días por semana: 3')
      expect(prompt).not.toContain('- Nivel de experiencia:')
      expect(prompt).not.toContain('- Duración por sesión:')
      expect(prompt).not.toContain('- Equipamiento disponible:')
      expect(prompt).not.toContain('- Notas adicionales:')
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

      expect(prompt).toContain('- Objetivo: Resistencia')
      expect(prompt).toContain('- Días por semana: 5')
      expect(prompt).not.toContain('null')
      expect(prompt).not.toContain('undefined')
    })

    it('el formato JSON usa placeholder genérico para goal', () => {
      const params = {
        objetivo: 'Hipertrofia',
        diasPorSemana: '2'
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('"goal": "Objetivo"')
      expect(prompt).toContain('- Objetivo: Hipertrofia')
    })

    it('incluye estructura JSON correcta en el prompt', () => {
      const params = {
        objetivo: 'Hipertrofia',
        diasPorSemana: '4'
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('"version": 4')
      expect(prompt).toContain('"exercises":')
      expect(prompt).toContain('"routine":')
      expect(prompt).toContain('"measurement_type"')
      expect(prompt).toContain('"muscle_group_name"')
      expect(prompt).toContain('Responde SOLO con el JSON')
    })

    it('incluye instrucciones para el chatbot', () => {
      const params = {
        objetivo: 'Fuerza',
        diasPorSemana: '3'
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('entrenador personal certificado')
      expect(prompt).toContain('CRITERIOS DE DISEÑO')
      expect(prompt).toContain('REGLAS IMPORTANTES')
      expect(prompt).toContain('CAMPOS DE EJERCICIOS')
    })
  })

  describe('buildAdaptRoutinePrompt', () => {
    it('genera prompt para adaptar rutina existente', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).toContain('Convierte esta rutina de entrenamiento')
      expect(prompt).toContain('MI RUTINA A CONVERTIR:')
    })

    it('incluye el formato JSON compartido', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).toContain('"version": 4')
      expect(prompt).toContain('"exercises":')
      expect(prompt).toContain('"routine":')
      expect(prompt).toContain('"tempo_razon"')
      expect(prompt).toContain('"duration_min"')
    })

    it('incluye las reglas compartidas', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).toContain('REGLAS IMPORTANTES')
      expect(prompt).toContain('CAMPOS DE EJERCICIOS')
      expect(prompt).toContain('CAMPOS DE BLOQUES')
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
      expect(ROUTINE_JSON_FORMAT).toContain('"version": 4')
      expect(ROUTINE_JSON_FORMAT).toContain('"exercises"')
      expect(ROUTINE_JSON_FORMAT).toContain('"routine"')
      expect(ROUTINE_JSON_FORMAT).toContain('"tempo_razon"')
      expect(ROUTINE_JSON_FORMAT).toContain('"duration_min"')
    })

    it('ROUTINE_JSON_RULES contiene documentación de campos', () => {
      expect(ROUTINE_JSON_RULES).toContain('REGLAS IMPORTANTES')
      expect(ROUTINE_JSON_RULES).toContain('CAMPOS DE EJERCICIOS')
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

      expect(chatbotPrompt).toContain('"tempo_razon"')
      expect(adaptPrompt).toContain('"tempo_razon"')

      expect(chatbotPrompt).toContain('CAMPOS DE EJERCICIOS')
      expect(adaptPrompt).toContain('CAMPOS DE EJERCICIOS')
    })
  })
})
