import { describe, it, expect } from 'vitest'
import { getRevealScrollOffset } from './scrollReveal.js'

// A 300 wide row of chips with 1000 of content.
const ROW = { viewportSize: 300, contentSize: 1000 }

describe('getRevealScrollOffset', () => {
  it('returns null when the item is already fully visible', () => {
    expect(getRevealScrollOffset({ ...ROW, itemStart: 100, itemSize: 80 })).toBeNull()
  })

  it('returns null when the item touches both edges exactly', () => {
    expect(getRevealScrollOffset({ ...ROW, itemStart: 0, itemSize: 300 })).toBeNull()
  })

  it('centres an item past the end of the view', () => {
    // Item centre at 540, minus half the viewport.
    expect(getRevealScrollOffset({ ...ROW, itemStart: 500, itemSize: 80 })).toBe(390)
  })

  it('centres an item cut by the right edge', () => {
    expect(getRevealScrollOffset({ ...ROW, itemStart: 260, itemSize: 80 })).toBe(150)
  })

  it('centres an item before the start of the view, measured from the current scroll', () => {
    expect(getRevealScrollOffset({ ...ROW, itemStart: 100, itemSize: 80, scrollOffset: 400 })).toBe(0)
    expect(getRevealScrollOffset({ ...ROW, itemStart: 300, itemSize: 80, scrollOffset: 400 })).toBe(190)
  })

  it('stops at the end of the content instead of centring the last item', () => {
    expect(getRevealScrollOffset({ ...ROW, itemStart: 940, itemSize: 60 })).toBe(700)
  })

  it('stays at 0 when the content fits the view', () => {
    expect(getRevealScrollOffset({ viewportSize: 300, contentSize: 200, itemStart: 250, itemSize: 80 })).toBe(0)
  })

  it('returns null before the container has been measured', () => {
    expect(getRevealScrollOffset({ viewportSize: 0, contentSize: 0, itemStart: 500, itemSize: 80 })).toBeNull()
    expect(getRevealScrollOffset({ viewportSize: undefined, contentSize: 0, itemStart: 500, itemSize: 80 })).toBeNull()
  })
})
