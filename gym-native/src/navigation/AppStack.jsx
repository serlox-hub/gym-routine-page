import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from '../screens/HomeScreen'
import RoutineDetailScreen from '../screens/RoutineDetailScreen'
import NewRoutineScreen from '../screens/NewRoutineScreen'
import WorkoutScreen from '../screens/WorkoutScreen'
import FreeWorkoutScreen from '../screens/FreeWorkoutScreen'
import HistoryScreen from '../screens/HistoryScreen'
import SessionDetailScreen from '../screens/SessionDetailScreen'
import PlaceholderScreen from '../screens/PlaceholderScreen'

const Stack = createNativeStackNavigator()

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#0d1117' },
}

export default function AppStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} />

      {/* Rutinas */}
      <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} />
      <Stack.Screen name="NewRoutine" component={NewRoutineScreen} />
      <Stack.Screen name="Templates" component={PlaceholderScreen} />
      <Stack.Screen name="ImportRoutine" component={PlaceholderScreen} />
      <Stack.Screen name="ChatbotPrompt" component={PlaceholderScreen} />
      <Stack.Screen name="AdaptRoutine" component={PlaceholderScreen} />

      {/* Workout */}
      <Stack.Screen name="Workout" component={WorkoutScreen} />
      <Stack.Screen name="FreeWorkout" component={FreeWorkoutScreen} />

      {/* Navegación secundaria */}
      <Stack.Screen name="Exercises" component={PlaceholderScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
      <Stack.Screen name="BodyMetrics" component={PlaceholderScreen} />
      <Stack.Screen name="Preferences" component={PlaceholderScreen} />
      <Stack.Screen name="AdminUsers" component={PlaceholderScreen} />
    </Stack.Navigator>
  )
}
