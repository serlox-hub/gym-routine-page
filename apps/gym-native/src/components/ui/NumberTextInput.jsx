import { useCallback, useRef, useState } from 'react'
import { TextInput } from 'react-native'

// TextInput que, al enfocarlo, coloca el cursor al FINAL del valor en vez de donde caiga el tap.
// Más cómodo para editar números prellenados: "100" → "120" manteniendo el "1" (retrocedes y
// añades, sin caer en medio). Drop-in de <TextInput>: reenvía todas las props.
//
// RN no tiene prop para "caret al final" (selectTextOnFocus selecciona TODO, no es lo que
// queremos). Controlamos `selection` solo en el focus (posiciona al final) y soltamos el control
// (selection=undefined) en el primer onSelectionChange para no bloquear el movimiento manual del
// caret ni provocar saltos al teclear.
//
// `selectTextOnFocus` (mismo nombre que la prop de RN, que NO se reenvía): selecciona todo el
// valor, para una sugerencia que lo tecleado debe sustituir (issue #67). No va por la prop nativa
// porque esta se puede reactivar CON el campo enfocado (teclear justo la sugerencia la vuelve a
// marcar) y en Android re-selecciona todo en el siguiente layout.
// La selección se MANTIENE mientras la sugerencia siga intacta (enfocada y sin teclear): en iOS el
// cursor del toque puede llegar DESPUÉS de la selección y pisarla (tocando a la izquierda del
// número, visto en dispositivo). En iOS la selección que manda JS no emite onSelectionChange, así
// que lo que llegue ahí es de iOS o del usuario; en Android sí la emite (llega {0,len}) y la
// comparación con {0,len} la descarta. Reaplicarla es seguro aunque el usuario ya haya tecleado:
// `setSelection` viaja con el contador de eventos y la plataforma descarta la orden obsoleta.
//
// `ref` se fusiona con el propio (en React 19 llega como prop): sin eso, el de `{...props}` quedaría
// pisado y un consumidor que encadene campos con `ref.current.focus()` recibiría null.
export default function NumberTextInput({ ref, value, onFocus, onBlur, onChange, onSelectionChange, selectTextOnFocus = false, ...props }) {
  const inputRef = useRef(null)
  const keepSelectedRef = useRef(false)
  const [selection, setSelection] = useState(undefined)
  const setRefs = useCallback((node) => {
    inputRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])
  const length = String(value ?? '').length
  const selectAll = () => inputRef.current?.setSelection(0, length)
  return (
    <TextInput
      {...props}
      ref={setRefs}
      value={value}
      selection={selection}
      onFocus={(e) => {
        keepSelectedRef.current = selectTextOnFocus
        if (selectTextOnFocus) selectAll()
        else setSelection({ start: length, end: length })
        onFocus?.(e)
      }}
      onBlur={(e) => {
        keepSelectedRef.current = false
        onBlur?.(e)
      }}
      onChange={(e) => {
        keepSelectedRef.current = false
        onChange?.(e)
      }}
      onSelectionChange={(e) => {
        setSelection(undefined)
        const { start, end } = e.nativeEvent.selection
        if (keepSelectedRef.current && selectTextOnFocus && (start !== 0 || end !== length)) selectAll()
        onSelectionChange?.(e)
      }}
    />
  )
}
