import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import DropdownMenu from './DropdownMenu.jsx'

const KEYBOARD_THRESHOLD = 150

function useKeyboardOffset() {
  const [offset, setOffset] = useState(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    let rafId = null
    const update = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const keyboardOpen = vv.height < window.innerHeight - KEYBOARD_THRESHOLD
        setOffset(keyboardOpen ? vv.offsetTop : null)
      })
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return offset
}

function PageHeader({
  title,
  titleExtra,
  backTo,
  onBack,
  menuItems,
  rightAction,
  children
}) {
  const navigate = useNavigate()
  const headerRef = useRef(null)
  const keyboardOffset = useKeyboardOffset()
  const [headerHeight, setHeaderHeight] = useState(0)

  useLayoutEffect(() => {
    if (!headerRef.current) return
    const ro = new ResizeObserver(() => {
      if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight)
    })
    ro.observe(headerRef.current)
    return () => ro.disconnect()
  }, [])

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  const showBack = backTo || onBack
  const isFixed = keyboardOffset !== null

  const innerContent = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack && (
            <button
              onClick={handleBack}
              className="-ml-1 p-1.5 rounded hover:opacity-80 shrink-0"
              style={{ color: colors.textPrimary }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <h1 className="text-xl font-bold truncate">{title}</h1>
          {titleExtra}
        </div>
        <div className="flex items-center gap-2">
          {rightAction}
          {menuItems && menuItems.length > 0 && (
            <DropdownMenu items={menuItems} />
          )}
        </div>
      </div>
      {children}
    </>
  )

  if (isFixed) {
    return (
      <>
        <header
          ref={headerRef}
          className="fixed left-0 right-0 z-40 pb-4 pt-4"
          style={{ backgroundColor: colors.bgPrimary, top: keyboardOffset }}
        >
          <div className="max-w-2xl mx-auto px-4">
            {innerContent}
          </div>
        </header>
        <div aria-hidden style={{ height: Math.max(0, headerHeight - 16) }} />
      </>
    )
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 pb-4 -mx-4 px-4 pt-4 -mt-4"
      style={{ backgroundColor: colors.bgPrimary }}
    >
      {innerContent}
    </header>
  )
}

export default PageHeader
