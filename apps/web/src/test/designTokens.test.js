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

describe('exerciseRowGap (design) — mismo hueco en web y native', () => {
  it('existe y vale lo mismo en las dos plataformas', () => {
    expect(typeof webDesign.exerciseRowGap).toBe('number')
    expect(nativeDesign.exerciseRowGap).toBe(webDesign.exerciseRowGap)
  })
})

// The minutes above the streak chart's bars (issue #224). The gap differs per platform, so it is
// written as `{ web, native }` in both files, like `chartHeight`, and compared whole.
const CHART_BAR_LABEL_TOKENS = ['chartBarLabelHeight', 'chartBarLabelSize']

describe('streak chart bar label tokens (design)', () => {
  for (const token of CHART_BAR_LABEL_TOKENS) {
    it(`${token} exists and is the same on web and native`, () => {
      expect(typeof webDesign[token]).toBe('number')
      expect(nativeDesign[token]).toBe(webDesign[token])
    })
  }

  it('chartBarLabelGap is the same { web, native } pair in both files', () => {
    expect(typeof webDesign.chartBarLabelGap.web).toBe('number')
    expect(typeof webDesign.chartBarLabelGap.native).toBe('number')
    expect(nativeDesign.chartBarLabelGap).toEqual(webDesign.chartBarLabelGap)
  })

  // The room above the tallest bar is a separate number from the font size and the gap, so a
  // bigger font or gap with the room left alone would clip the label. Native has no runner and
  // the e2e measures web only, so this is the one place both platforms' numbers are held together.
  it('chartBarLabelHeight leaves room for the digits plus the gap, on both platforms', () => {
    for (const design of [webDesign, nativeDesign]) {
      const largestGap = Math.max(design.chartBarLabelGap.web, design.chartBarLabelGap.native)
      expect(design.chartBarLabelHeight).toBeGreaterThanOrEqual(design.chartBarLabelSize + largestGap)
    }
  })
})
