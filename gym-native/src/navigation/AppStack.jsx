import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from '../screens/HomeScreen'
import RoutineDetailScreen from '../screens/RoutineDetailScreen'
import NewRoutineScreen from '../screens/NewRoutineScreen'
import WorkoutScreen from '../screens/WorkoutScreen'
import FreeWorkoutScreen from '../screens/FreeWorkoutScreen'
import HistoryScreen from '../screens/HistoryScreen'
import SessionDetailScreen from '../screens/SessionDetailScreen'
import ExercisesScreen from '../screens/ExercisesScreen'
import NewExerciseScreen from '../screens/NewExerciseScreen'
import EditExerciseScreen from '../screens/EditExerciseScreen'
import ExerciseProgressScreen from '../screens/ExerciseProgressScreen'
import BodyMetricsScreen from '../screens/BodyMetricsScreen'
import PreferencesScreen from '../screens/PreferencesScreen'
import AdminUsersScreen from '../screens/AdminUsersScreen'

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

      {/* Workout */}
      <Stack.Screen name="Workout" component={WorkoutScreen} />
      <Stack.Screen name="FreeWorkout" component={FreeWorkoutScreen} />

      {/* Navegación secundaria */}
      <Stack.Screen name="Exercises" component={ExercisesScreen} />
      <Stack.Screen name="NewExercise" component={NewExerciseScreen} />
      <Stack.Screen name="EditExercise" component={EditExerciseScreen} />
      <Stack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
      <Stack.Screen name="BodyMetrics" component={BodyMetricsScreen} />
      <Stack.Screen name="Preferences" component={PreferencesScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
    </Stack.Navigator>
  )
}
