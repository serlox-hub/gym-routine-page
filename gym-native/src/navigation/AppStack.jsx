import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from '../screens/HomeScreen'
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
      <Stack.Screen name="RoutineDetail" component={PlaceholderScreen} />
      <Stack.Screen name="NewRoutine" component={PlaceholderScreen} />
      <Stack.Screen name="Templates" component={PlaceholderScreen} />
      <Stack.Screen name="ImportRoutine" component={PlaceholderScreen} />
      <Stack.Screen name="ChatbotPrompt" component={PlaceholderScreen} />
      <Stack.Screen name="AdaptRoutine" component={PlaceholderScreen} />

      {/* Workout */}
      <Stack.Screen name="Workout" component={PlaceholderScreen} />
      <Stack.Screen name="FreeWorkout" component={PlaceholderScreen} />

      {/* Navegación secundaria */}
      <Stack.Screen name="Exercises" component={PlaceholderScreen} />
      <Stack.Screen name="History" component={PlaceholderScreen} />
      <Stack.Screen name="BodyMetrics" component={PlaceholderScreen} />
      <Stack.Screen name="Preferences" component={PlaceholderScreen} />
      <Stack.Screen name="AdminUsers" component={PlaceholderScreen} />
    </Stack.Navigator>
  )
}
