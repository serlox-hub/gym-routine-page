import { useState } from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GreetingHeader, StreakCard, StatsRow, TodaysWorkout, RemindersBanner } from '../components/Home'
import { design } from '../lib/styles'

export default function HomeScreen({ navigation }) {
  const [scrollEnabled, setScrollEnabled] = useState(true)
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: design.tabContentPaddingBottom }}
      >
        <GreetingHeader navigation={navigation} />
        <StreakCard onScrubbingChange={(active) => setScrollEnabled(!active)} />
        <StatsRow />
        <RemindersBanner navigation={navigation} />
        <TodaysWorkout navigation={navigation} />
      </ScrollView>
    </SafeAreaView>
  )
}
