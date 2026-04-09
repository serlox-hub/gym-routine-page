import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GreetingHeader, StreakCard, StatsRow, TodaysWorkout } from '../components/Home'

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 }}>
        <GreetingHeader navigation={navigation} />
        <StreakCard />
        <StatsRow />
        <TodaysWorkout navigation={navigation} />
      </ScrollView>
    </SafeAreaView>
  )
}
