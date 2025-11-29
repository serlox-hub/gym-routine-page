# Perfil del Usuario y Preferencias de Entrenamiento

## Datos Personales

- **Tipo de cuerpo**: Ectomorfo
- **Experiencia**: +10 años de entrenamiento
- **Hábitos**: Sedentario (trabaja muchas horas frente al ordenador)
- **Limitaciones de movilidad**: Ninguna
- **Sueño**: 7-8 horas (óptimo)
- **Proteína**: 1.8-2.2 g/kg (óptimo)

## Objetivos (por prioridad)

1. **Máxima hipertrofia** con foco en brazos y hombros (60%)
2. **Fortalecimiento de core/abdominales** (40%)
3. **Corrección postural** (cifosis por trabajo sedentario)

## Preferencias de Entrenamiento

- **Duración máxima**: ~90 minutos (incluyendo calentamiento)
- **Frecuencia**: 4 días/semana
- **Piernas**: Mínimo interés, 1 día de mantenimiento es suficiente
- **Abdominales**: Siempre al principio de la sesión (por adherencia, al final le da pereza)
- **Calentamiento**: Ya calienta rotadores del hombro con goma elástica en días de upper body (días 1, 3, 4)

## Principios Científicos a Aplicar

### Hipertrofia en Posición de Estiramiento (Pedrosa 2023)
- Ejercicios en posición de stretch producen +20% de hipertrofia
- Priorizar: curl inclinado, extensiones overhead, elevaciones laterales desde atrás
- Aplicar excéntricos de 2-3s y pausa de 1s en el stretch

### Tiempos de Descanso (Schoenfeld 2016)
- **Compuestos pesados**: 2-3 minutos (120-180s)
- **Aislamiento**: 90-120 segundos
- **Ejercicios metabólicos/finishers**: 45-60 segundos

### Tempo de Repeticiones
- **Formato**: Concéntrico-Pausa arriba-Excéntrico-Pausa abajo
- **Concéntrico**: 1-2s explosivo pero controlado (Wilk 2021)
- **Excéntrico**: 2-3s óptimo, >4s no añade beneficio (Lacerda 2019)
- **Pausa en stretch**: 0-1s según el ejercicio (Pedrosa 2023)
- **Tempo estándar aislamiento**: 1-1-2-0
- **Tempo ejercicios en stretch**: 1-1-3-1
- **Tempo compuestos**: 1-0-2-0

### Volumen Semanal Óptimo
- **Deltoides lateral**: 12-20 series (prioridad alta)
- **Bíceps**: 10-20 series (prioridad alta)
- **Tríceps**: 10-16 series (prioridad alta)
- **Rear delt/postura**: 8-12 series
- **Espalda**: 10-20 series
- **Core**: 8-16 series
- **Pecho**: 6-10 series (mantenimiento)
- **Piernas**: Mantenimiento (no es prioridad)

### Ejercicios Preferidos por Grupo Muscular

#### Bíceps (cabeza larga - prioridad)
- **Curl Inclinado** (banco 45°) - máximo stretch
- **Curl Bayesiano en polea** - el mejor para cabeza larga
- **Curl Martillo Inclinado** - braquial en stretch

#### Tríceps (cabeza larga - prioridad)
- **Extensión Overhead en polea** - máximo stretch cabeza larga
- **Pushdown con cuerda/barra V** - cabeza lateral

#### Deltoides Lateral
- **Elevación Lateral en Polea desde atrás** - mejor curva de resistencia (Kassiano 2023)
- Cables superiores a mancuernas para tensión en stretch

#### Postura/Rear Delt
- **Face Pulls** - crítico para rotadores externos, codos ALTOS
- **Y-Raises** - trapecio inferior
- **Remo Alto** - trapecios medios
- **Farmer's Walk** - core + postura global

#### Core (anti-extensión/anti-rotación > flexión espinal)
- **Rueda Abdominal** - anti-extensión
- **Dead Bug** - estabilidad
- **Pallof Press** - anti-rotación
- **Plancha Lateral** - oblicuos
- **Hollow Body Hold** - anti-extensión
- Limitar crunch en polea (flexión espinal) por trabajo sedentario

### Progresión
- **Método**: Double Progression
  1. Empezar en rango bajo de reps
  2. Añadir 1 rep por sesión manteniendo RIR
  3. Al llegar al rango alto en todas las series, subir peso 2.5-5%
  4. Volver al rango bajo con nuevo peso
- **Deload**: Cada 6-8 semanas, reducir volumen 40-50%, mantener intensidad

## Referencias Científicas Clave

| Autor | Año | Hallazgo |
|-------|-----|----------|
| Schoenfeld et al. | 2015 | Duración de rep 0.5-8s produce hipertrofia similar |
| Schoenfeld et al. | 2016 | Descansos 2-3min compuestos, 90-120s aislamiento |
| Lacerda et al. | 2019 | Excéntricos 2-4s óptimos, >4s sin beneficio adicional |
| Wilk et al. | 2021 | Concéntricos explosivos permiten mayor carga |
| Pedrosa et al. | 2023 | Ejercicios en stretch +20% hipertrofia |
| Kassiano et al. | 2023 | Cables > mancuernas para laterales (curva de resistencia) |

## Formato JSON para Rutinas

Cuando generes rutinas, usar este formato:

```json
{
  "nombre": "Nombre de la rutina",
  "perfil": {
    "tipo_cuerpo": "Ectomorfo",
    "experiencia": "+10 años",
    "foco": "descripción del foco",
    "duracion_max_min": 90,
    "frecuencia_dias": 4
  },
  "dias": [
    {
      "dia": 1,
      "nombre": "Nombre del día",
      "duracion_estimada_min": 85,
      "bloques": [
        {
          "bloque": "Nombre del bloque",
          "duracion_min": 10,
          "ejercicios": [
            {
              "nombre": "Nombre en español",
              "nombre_en": "English name",
              "musculos": {
                "principal": "Músculo principal",
                "secundarios": ["Músculo 1", "Músculo 2"]
              },
              "series": 3,
              "reps": "8-10",
              "rir": "1-2",
              "descanso_seg": 90,
              "tempo": "1-1-2-0",
              "tempo_razon": "Explicación del tempo",
              "altura_polea": "Alta/Media/Baja (solo si aplica)",
              "notas": "Notas de ejecución"
            }
          ]
        }
      ]
    }
  ],
  "volumen_semanal": {},
  "progresion": {},
  "referencias_cientificas": []
}
```

## Notas Adicionales

- El usuario ya tiene una rutina de hipertrofia guardada en `routines/hipertrofia.json`
- La web muestra las rutinas con todos los detalles incluyendo tempo, RIR, descanso, músculos y altura de polea
- Preferencia por explicaciones basadas en evidencia científica
