import { useRef, useState, useCallback, useEffect } from 'react'

// ============================================
// DRAGGABLE HOOK
// ============================================

export function useDraggable() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragState = useRef({ active: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 })
  const wasDragged = useRef(false)

  const getClientPos = (e) => {
    if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    return { x: e.clientX, y: e.clientY }
  }

  const handleStart = useCallback((e) => {
    const pos = getClientPos(e)
    dragState.current = {
      active: true,
      startX: pos.x,
      startY: pos.y,
      offsetX: position.x,
      offsetY: position.y,
    }
    wasDragged.current = false
    if (!e.touches) e.preventDefault()
  }, [position])

  const handleMove = useCallback((e) => {
    if (!dragState.current.active) return
    if (e.cancelable) e.preventDefault()
    const pos = getClientPos(e)
    const dx = pos.x - dragState.current.startX
    const dy = pos.y - dragState.current.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) wasDragged.current = true
    setPosition({
      x: dragState.current.offsetX + dx,
      y: dragState.current.offsetY + dy,
    })
  }, [])

  const handleEnd = useCallback(() => {
    dragState.current.active = false
  }, [])

  useEffect(() => {
    const onMove = (e) => handleMove(e)
    const onEnd = () => handleEnd()

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [handleMove, handleEnd])

  const dragProps = {
    onMouseDown: handleStart,
    onTouchStart: handleStart,
  }

  const dragStyle = {
    transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
    cursor: dragState.current.active ? 'grabbing' : 'grab',
  }

  return { dragProps, dragStyle, wasDragged }
}
