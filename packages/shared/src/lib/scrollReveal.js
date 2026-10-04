/**
 * Scroll offset that brings an item fully into view inside a scroll container,
 * centred, or null when it is already fully visible (so nothing moves). Works on
 * either axis: every value is along the scroll axis, in content coordinates
 * (0 = start of the scrolled content).
 *
 * @param {Object} layout
 * @param {number} layout.itemStart - Where the item begins in the content
 * @param {number} layout.itemSize - Item length along the axis
 * @param {number} layout.viewportSize - Visible length of the container
 * @param {number} layout.contentSize - Full length of the scrolled content
 * @param {number} [layout.scrollOffset] - Current scroll position (default 0)
 * @returns {number|null} New scroll position, clamped to the content, or null
 */
export function getRevealScrollOffset({ itemStart, itemSize, viewportSize, contentSize, scrollOffset = 0 }) {
  if (!(viewportSize > 0)) return null
  const itemEnd = itemStart + itemSize
  if (itemStart >= scrollOffset && itemEnd <= scrollOffset + viewportSize) return null

  const centred = itemStart + itemSize / 2 - viewportSize / 2
  const maxOffset = Math.max(0, contentSize - viewportSize)
  return Math.min(Math.max(0, centred), maxOffset)
}
