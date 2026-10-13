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

  it('marking a goal with no routine of its own says why, there and again on the recommendation', () => {
    answerUpToGoals()
    // No template has fat loss as its goal: it always falls back.
    fireEvent.click(button(goalLabel(GOAL_VALUES.FAT_LOSS)))
    // The sentence up to the recommended template's name, which depends on the catalog.
    const [whyPrefix] = i18n
      .t('routine:onboarding.guidance.noTemplate', { goal: goalLabel(GOAL_VALUES.FAT_LOSS), template: '\u0000' })
      .split('\u0000')
    expect(screen.getByText(content => content.startsWith(whyPrefix))).toBeInTheDocument()

    fireEvent.click(nextButton())

    expect(screen.getByText(i18n.t('routine:onboarding.recommendedTitle'))).toBeInTheDocument()
    // On the last step the reason explains the fallback.
    const [reasonPrefix] = i18n.t('routine:onboarding.reason.fatLoss', { template: '\u0000' }).split('\u0000')
    expect(screen.getByText(content => content.startsWith(reasonPrefix))).toBeInTheDocument()
  })
})

// Issue #45: the last step says why, shows the week and offers alternatives before the rest.
describe('OnboardingWizard — recommendation step', () => {
  const templateName = id => i18n.t(`routine:templates.items.${id}.name`)
  const card = id => screen.getByText(templateName(id)).closest('button')

  // 4 days, intermediate, full gym, hypertrophy: Upper / Lower, with PPL 3 days and Full Body as alternatives.
  function answerAll(days = '4') {
    render(<OnboardingWizard onComplete={vi.fn()} />)
    fireEvent.click(button(days))
    fireEvent.click(nextButton())
    fireEvent.click(button(i18n.t('routine:chatbot.levels.intermediate')))
    fireEvent.click(nextButton())
    fireEvent.click(button(i18n.t('routine:onboarding.equipment.full')))
    fireEvent.click(nextButton())
    fireEvent.click(button(goalLabel(GOAL_VALUES.HYPERTROPHY)))
    fireEvent.click(nextButton())
  }

  it('the recommended routine is selected, says why and shows its week without the "Día N - " prefix', () => {
    answerAll()
    expect(card('upper-lower')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(i18n.t('routine:onboarding.reason.onYourDays.hypertrophy', {
      template: templateName('upper-lower'),
      yourDays: i18n.t('common:home.nDays', { count: 4 }),
    }))).toBeInTheDocument()
    expect(screen.getAllByText('Upper (Fuerza)')).toHaveLength(1)
    expect(screen.queryByText(/^Día \d/)).not.toBeInTheDocument()
  })

  it('offers the alternatives with their line, and the rest only after "see all"', () => {
    answerAll()
    expect(screen.getByText(i18n.t('routine:onboarding.alternativesTitle'))).toBeInTheDocument()
    expect(card('ppl-3')).toBeInTheDocument()
    expect(screen.getByText(i18n.t('routine:onboarding.why.fewerDays', { days: i18n.t('common:home.nDays', { count: 3 }) }))).toBeInTheDocument()
    expect(card('full-body')).toBeInTheDocument()
    expect(screen.queryByText(templateName('531'))).not.toBeInTheDocument()

    fireEvent.click(button(i18n.t('routine:onboarding.seeAll')))

    expect(screen.queryByText(i18n.t('routine:onboarding.seeAll'))).not.toBeInTheDocument()
    expect(card('531')).toBeInTheDocument()
  })

  it('any routine can still be picked: it opens its week and its days note, and the recommended one closes', () => {
    answerAll('3')
    fireEvent.click(button(i18n.t('routine:onboarding.seeAll')))
    fireEvent.click(card('531'))

    expect(card('531')).toHaveAttribute('aria-pressed', 'true')
    expect(card('ppl-3')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Peso Muerto')).toBeInTheDocument()
    expect(screen.queryByText('Push')).not.toBeInTheDocument()
    expect(screen.getByText(i18n.t('routine:onboarding.daysNote.tooFew', { min: 4, requested: 3 }))).toBeInTheDocument()
  })

  it('the recommended routine tells its spare days in its reason, not in a note of its own', () => {
    answerAll('6')
    const spare = i18n.t('routine:onboarding.daysNote.spare', { actual: 4, requested: 6 })
    expect(screen.getByText(content => content.endsWith(spare))).toBeInTheDocument()
    expect(screen.queryByText(spare)).not.toBeInTheDocument()
  })
})
