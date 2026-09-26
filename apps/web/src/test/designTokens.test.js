import { describe, it, expect } from 'vitest'
import { design as webDesign } from '../lib/styles.js'
import { design as nativeDesign } from '../../../gym-native/src/lib/styles.js'

// Los tokens de gesto los consumen las DOS apps y viven duplicados en sus `styles.js`. Si uno
// deriva, el swipe se siente distinto en cada plataforma y nada lo caza: `apps/gym-native` no
// tiene runner, así que la comprobación vive en la suite de web, como `envExample.test.js`.
const GESTURE_TOKENS = ['gestureActivationDistance', 'swipeDeleteThreshold', 'swipeDeleteMaxTravel', 'dragAutoScrollEdge']

describe('tokens de gesto de fila (design)', () => {
  for (const token of GESTURE_TOKENS) {
    it(`${token} existe y vale lo mismo en web y native`, () => {
      expect(typeof webDesign[token]).toBe('number')
      expect(nativeDesign[token]).toBe(webDesign[token])
    })
  }

  it('el recorrido máximo supera al umbral de borrado, o la fila no podría borrarse nunca', () => {
    expect(webDesign.swipeDeleteMaxTravel).toBeGreaterThan(webDesign.swipeDeleteThreshold)
  })
})
