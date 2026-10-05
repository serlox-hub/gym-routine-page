import { expect } from '@playwright/test'

// Touch-target guard (issue #151): every tap control inside `scope` has a pressable box at least
// 44px tall, and also 44px wide when it shows no text (CLAUDE.md → Touch targets). It measures the
// rendered box, so it sees what a Tailwind class, an inline style or a child's size end up giving.
//
// A `div` clickable only through a React `onClick` has no role to select it by, so it is found by
// its pointer cursor (`cursor-pointer`): the history's exercise header slipped past the first
// version of this guard that way. Still not seen: a clickable `div` without that cursor, and one
// nested inside another pointer-cursor element that is not a control (only the outermost is measured,
// because children inherit the cursor).

const MIN_TOUCH_TARGET = 44

const CONTROL_SELECTOR = [
  'button',
  'a[href]',
  'select',
  '[role="button"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="radio"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  // A tap opens the picker, so it is a tap control (the history edit mode's start/end).
  'input[type="datetime-local"]',
].join(', ')

/**
 * Measures every visible tap control inside `scope` and fails, in ONE assertion, listing each one
 * under the rule as `name — W×H`. Only what is inside `scope` is measured: pass the open modal or
 * overlay so that what sits under it is not, or `page.locator('body')` when none is open.
 *
 * @param {import('@playwright/test').Locator} scope
 * @param {{ exempt?: { name: string | RegExp, reason: string }[] }} [options] - controls allowed to
 *   break the rule, matched on the reported name. An exemption that matches no offender fails too,
 *   so a stale one gets removed instead of hiding the next control with that name.
 */
export async function expectTouchTargets(scope, { exempt = [] } = {}) {
  const controls = await scope.evaluate(measureControls, CONTROL_SELECTOR)

  const offenders = controls.filter(control => findProblem(control) !== null)
  const isExempt = (control) => exempt.some(({ name }) => matchesName(control.name, name))
  const problems = offenders
    .filter(control => !isExempt(control))
    .map(control => `${control.name} — ${control.width}×${control.height} (${findProblem(control)})`)
  const staleExemptions = exempt
    .filter(({ name }) => !offenders.some(control => matchesName(control.name, name)))
    .map(({ name }) => `stale exemption: ${name}`)

  expect([...problems, ...staleExemptions], 'tap controls under the 44px touch-target rule').toEqual([])
}

function matchesName(controlName, name) {
  return name instanceof RegExp ? name.test(controlName) : controlName === name
}

/** Why a measured control breaks the rule, or null when it does not. */
function findProblem({ width, height, hasText, hasName, ariaHidden }) {
  if (height < MIN_TOUCH_TARGET) return 'too short'
  if (!hasText && width < MIN_TOUCH_TARGET) return 'too narrow for an icon-only control'
  if (!hasText && !hasName && !ariaHidden) return 'icon-only control with no accessible name'
  return null
}

/**
 * Runs in the browser: one `evaluate` for every control, so the boxes are read in one layout.
 * Self-contained on purpose (Playwright serialises it), hence the helpers inside.
 */
function measureControls(root, selector) {
  const textOf = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim()
  const labelledBy = (element) => (element.getAttribute('aria-labelledby') ?? '')
    .split(/\s+/)
    .map(id => textOf(document.getElementById(id)))
    .join(' ')
    .trim()
  // The name in the report (and the one exemptions match): aria-label, text, title.
  const reportName = (element) =>
    element.getAttribute('aria-label')?.trim() || textOf(element) || element.getAttribute('title')?.trim() || ''
  // Other ways a control gets an accessible name, only to tell "unnamed" apart.
  const otherName = (element) =>
    labelledBy(element)
    || [...(element.labels ?? [])].map(textOf).join(' ').trim()
    || [...element.querySelectorAll('img[alt]')].map(img => img.alt.trim()).join(' ').trim()
  const fallbackName = (element) => [element.tagName.toLowerCase(), element.classList[0]].filter(Boolean).join('.')

  // Clickable without being a control: the outermost element showing the pointer cursor that is
  // not inside a control (its children inherit the cursor, and a control's insides are the control).
  const isPointer = (element) => element && getComputedStyle(element).cursor === 'pointer'
  const pointerOnly = [...root.querySelectorAll('*')].filter(element =>
    !element.closest(selector) && isPointer(element) && !isPointer(element.parentElement))

  return [...root.querySelectorAll(selector), ...pointerOnly]
    .filter(element => element.checkVisibility({ checkVisibilityCSS: true }))
    .map(element => {
      const rect = element.getBoundingClientRect()
      const name = reportName(element)
      return {
        name: name || fallbackName(element),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        // innerText, not textContent: only text that is actually painted counts as a label.
        hasText: (element.innerText ?? '').trim().length > 0,
        hasName: (name || otherName(element)).length > 0,
        ariaHidden: element.closest('[aria-hidden="true"]') !== null,
      }
    })
    .filter(({ width, height }) => width > 0 && height > 0)
}
