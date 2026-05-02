import { GreetingHeader, StreakCard, StatsRow, TodaysWorkout } from '../components/Home/index.js'

function Home() {
  return (
    <div className="p-4 max-w-2xl mx-auto pb-20">
      <GreetingHeader />
      <StreakCard />
      <StatsRow />
      <TodaysWorkout />
    </div>
  )
}

export default Home
