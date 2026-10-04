import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import DragHandle from './DragHandle.jsx'
import { design } from '../../lib/styles.js'

// The icon sits in 4px of padding in the layout (what the handle took before the touch target).
const LAYOUT_PADDING = 4

function renderHandle(size) {
  const { container } = render(<DragHandle dragHandleProps={{ style: {} }} size={size} />)
  const { padding, margin } = container.querySelector('button').style
  return { padding: parseFloat(padding), margin: parseFloat(margin) }
}

describe('DragHandle — touch target', () => {
  it.each([14, 16, 20])('size %i: the box is 44px and the layout only grows by the icon plus its old padding', (size) => {
    const { padding, margin } = renderHandle(size)

    // The tappable box is icon + padding on both sides...
    expect(size + 2 * padding).toBe(design.minTouchTarget)
    // ...and the negative margin gives back to the layout all that is not the old 4px of padding,
    // so neighbours do not move.
    expect(size + 2 * (padding + margin)).toBe(size + 2 * LAYOUT_PADDING)
  })
})
