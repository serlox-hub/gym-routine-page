import { useOnboardingGate } from '@gym/shared'
import { GreetingHeader, StreakCard, StatsRow, TodaysWorkout, RemindersBanner, OnboardingWizard } from '../components/Home/index.js'

function Home() {
  const onboarding = useOnboardingGate()

  return (
    <div className="p-4 max-w-2xl mx-auto pb-20">
      <GreetingHeader />
      <StreakCard />
      <StatsRow />
      <RemindersBanner />
      <TodaysWorkout />
      {onboarding.shouldShow && <OnboardingWizard onComplete={onboarding.complete} />}
    </div>
  )
}

export default Home
