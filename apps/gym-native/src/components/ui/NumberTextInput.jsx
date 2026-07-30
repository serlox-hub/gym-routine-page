import { useState } from 'react'
import { TextInput } from 'react-native'

// TextInput que, al enfocarlo, coloca el cursor al FINAL del valor en vez de donde caiga el tap.
// Más cómodo para editar números prellenados: "100" → "120" manteniendo el "1" (retrocedes y
// añades, sin caer en medio). Drop-in de <TextInput>: reenvía todas las props.
//
// RN no tiene prop para "caret al final" (selectTextOnFocus selecciona TODO, no es lo que
// queremos). Controlamos `selection` solo en el focus (posiciona al final) y soltamos el control
// (selection=undefined) en el primer onSelectionChange para no bloquear el movimiento manual del
// caret ni provocar saltos al teclear.
export default function NumberTextInput({ value, onFocus, onSelectionChange, ...props }) {
  const [selection, setSelection] = useState(undefined)
  return (
    <TextInput
      {...props}
      value={value}
      selection={selection}
      onFocus={(e) => {
        const len = String(value ?? '').length
        setSelection({ start: len, end: len })
        onFocus?.(e)
      }}
      onSelectionChange={(e) => {
        setSelection(undefined)
        onSelectionChange?.(e)
      }}
    />
  )
}
