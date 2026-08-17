import CaretEndInput from './CaretEndInput.jsx'

// Input de número CON decimales. NO usa `type="number"` a propósito: ese tipo delega el separador
// decimal en el locale del NAVEGADOR (no en el idioma de la app), así que con el navegador en
// inglés teclear "82,5" deja **"825"** — sin aviso, y con `validity.valid === true`. Medido:
// es-ES → "82.5" ✅ · en-GB → "825" ❌ (el punto funciona en ambos). Registrar 825 kg en silencio
// no es aceptable, así que aquí se acepta coma o punto y se normaliza a punto al vuelo, igual que
// hace native. Ver docs/DECISIONS.md e issue #26.
//
// Se normaliza en el evento (no solo al parsear) para que cualquier consumidor pueda usar
// `Number()` sin saber de comas; el resto de props (value, placeholder, style…) pasan tal cual.
export default function DecimalInput({ onChange, ...props }) {
  const handleChange = (e) => {
    // Solo se reasigna si hay coma: reasignar mueve el caret al final y no queremos hacerlo
    // en cada pulsación (solo al meter el separador, donde el caret ya está al final).
    if (e.target.value.includes(',')) {
      e.target.value = e.target.value.replace(',', '.')
    }
    onChange?.(e)
  }

  return <CaretEndInput {...props} type="text" inputMode="decimal" onChange={handleChange} />
}
