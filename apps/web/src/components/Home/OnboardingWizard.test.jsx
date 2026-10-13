import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initReactI18next } from 'react-i18next'
import { i18n, initI18n, GOAL_VALUES, GOAL_OPTIONS, MAX_GOALS } from '@gym/shared'

// Without this the components render the KEY instead of the text. See DayCard.test.jsx.
i18n.use(initReactI18next)
initI18n()

import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../../hooks/useRoutines.js', () => ({
  useCreateRoutineFromTemplate: () => ({ mutateAsync: vi.fn() }),
}))

import OnboardingWizard from './OnboardingWizard.jsx'

const goalLabel = value => i18n.t(GOAL_OPTIONS.find(o => o.value === value).labelKey)
const button = text => screen.getByText(text).closest('button')
const nextButton = () => button(i18n.t('common:buttons.next'))

// Days, level and equipment, the three steps before the goals.
function answerUpToGoals() {
  fireEvent.click(button('3'))
  fireEvent.click(nextButton())
  fireEvent.click(button(i18n.t('routine:chatbot.levels.intermediate')))
  fireEvent.click(nextButton())
  fireEvent.click(button(i18n.t('routine:onboarding.equipment.full')))
  fireEvent.click(nextButton())
}

// Issue #41: the goals moved to the last question and take up to two.
describe('OnboardingWizard — goal step', () => {
  beforeEach(() => {
    render(<OnboardingWizard onComplete={vi.fn()} />)
  })

  it('asks days, level and equipment first, each one holding Next until answered', () => {
    expect(nextButton()).toBeDisabled()
    fireEvent.click(button('3'))
    expect(nextButton()).toBeEnabled()
    fireEvent.click(nextButton())

    expect(nextButton()).toBeDisabled()
    fireEvent.click(button(i18n.t('routine:chatbot.levels.intermediate')))
    fireEvent.click(nextButton())

    expect(nextButton()).toBeDisabled()
    fireEvent.click(button(i18n.t('routine:onboarding.equipment.full')))
    fireEvent.click(nextButton())

    expect(screen.getByText(i18n.t('routine:onboarding.goalQuestion'))).toBeInTheDocument()
  })

  it('holds Next until a goal is marked, and again once the last one is unmarked', () => {
    answerUpToGoals()
    expect(nextButton()).toBeDisabled()

    fireEvent.click(button(goalLabel(GOAL_VALUES.HYPERTROPHY)))
    expect(nextButton()).toBeEnabled()

    fireEvent.click(button(goalLabel(GOAL_VALUES.HYPERTROPHY)))
    expect(nextButton()).toBeDisabled()
  })

  it(`at ${MAX_GOALS} goals another chip still answers: it says why instead of marking itself`, () => {
    answerUpToGoals()
    fireEvent.click(button(goalLabel(GOAL_VALUES.HYPERTROPHY)))
    fireEvent.click(button(goalLabel(GOAL_VALUES.STRENGTH)))
    const maxNotice = i18n.t('routine:onboarding.goalMaxReached', { max: MAX_GOALS })
    expect(screen.queryByText(maxNotice)).not.toBeInTheDocument()

    const third = button(goalLabel(GOAL_VALUES.GENERAL))
    expect(third).toBeEnabled()
    fireEvent.click(third)

    expect(third).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(maxNotice)).toBeInTheDocument()

    // Unmarking frees a place, and the notice goes with the next tap that does something.
    fireEvent.click(button(goalLabel(GOAL_VALUES.STRENGTH)))
    expect(screen.queryByText(maxNotice)).not.toBeInTheDocument()
    fireEvent.click(third)
    expect(third).toHaveAttribute('aria-pressed', 'true')
  })

  it('marking a goal with no routine of its own says why, there and on the recommendation', () => {
    answerUpToGoals()
    // No template has fat loss as its goal: it always falls back.
    fireEvent.click(button(goalLabel(GOAL_VALUES.FAT_LOSS)))
    // The sentence up to the recommended template's name, which depends on the catalog.
    const [whyPrefix] = i18n
      .t('routine:onboarding.guidance.noTemplate', { goal: goalLabel(GOAL_VALUES.FAT_LOSS), template: '\u0000' })
      .split('\u0000')
    const why = content => content.startsWith(whyPrefix)
    expect(screen.getByText(why)).toBeInTheDocument()

    fireEvent.click(nextButton())

    expect(screen.getByText(i18n.t('routine:onboarding.recommendedTitle'))).toBeInTheDocument()
    expect(screen.getByText(why)).toBeInTheDocument()
  })
})
