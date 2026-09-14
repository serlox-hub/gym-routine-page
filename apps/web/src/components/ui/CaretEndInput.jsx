// Input que, al enfocarlo, coloca el cursor al FINAL del valor en vez de donde caiga el tap.
// Más cómodo para editar números prellenados: "100" → "120" manteniendo el "1" (retrocedes y
// añades, sin caer en medio). Drop-in de <input>: reenvía todas las props (type, inputMode,
// value, onChange, className, style, etc.) y solo envuelve onFocus.
//
// `<input type="number">` NO soporta setSelectionRange (lanza), así que reasignamos el value
// (reasignar coloca el caret al final). requestAnimationFrame: se ejecuta DESPUÉS de que el
// navegador coloque el caret en el punto del tap, corrigiéndolo.
//
// `selectTextOnFocus` (mismo nombre que la prop de RN): selecciona TODO en vez de ir al final, para
// un valor que es solo una sugerencia y que lo tecleado debe sustituir (issue #67). `select()` sí
// vale en type=number, y en el rAF sobrevive al mouseup y al toque (medido en Chromium y WebKit).
export default function CaretEndInput({ onFocus, selectTextOnFocus = false, ...props }) {
  const handleFocus = (e) => {
    onFocus?.(e)
    const el = e.currentTarget
    requestAnimationFrame(() => {
      if (selectTextOnFocus) {
        el.select()
        return
      }
      const v = el.value
      if (v) { el.value = ''; el.value = v }
    })
  }
  return <input {...props} onFocus={handleFocus} />
}
