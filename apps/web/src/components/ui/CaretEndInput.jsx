// Input que, al enfocarlo, coloca el cursor al FINAL del valor en vez de donde caiga el tap.
// Más cómodo para editar números prellenados: "100" → "120" manteniendo el "1" (retrocedes y
// añades, sin caer en medio). Drop-in de <input>: reenvía todas las props (type, inputMode,
// value, onChange, className, style, etc.) y solo envuelve onFocus.
//
// `<input type="number">` NO soporta setSelectionRange (lanza), así que reasignamos el value
// (reasignar coloca el caret al final). requestAnimationFrame: se ejecuta DESPUÉS de que el
// navegador coloque el caret en el punto del tap, corrigiéndolo.
export default function CaretEndInput({ onFocus, ...props }) {
  const handleFocus = (e) => {
    onFocus?.(e)
    const el = e.currentTarget
    requestAnimationFrame(() => {
      const v = el.value
      if (v) { el.value = ''; el.value = v }
    })
  }
  return <input {...props} onFocus={handleFocus} />
}
