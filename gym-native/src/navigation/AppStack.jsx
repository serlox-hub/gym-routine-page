import { View } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useRestoreActiveSession } from '../hooks/useWorkout'
import HomeScreen from '../screens/HomeScreen'
import RoutineDetailScreen from '../screens/RoutineDetailScreen'
import NewRoutineScreen from '../screens/NewRoutineScreen'
import HistoryScreen from '../screens/HistoryScreen'
import SessionDetailScreen from '../screens/SessionDetailScreen'
import ExercisesScreen from '../screens/ExercisesScreen'
import NewExerciseScreen from '../screens/NewExerciseScreen'
import EditExerciseScreen from '../screens/EditExerciseScreen'
import ExerciseProgressScreen from '../screens/ExerciseProgressScreen'
import BodyMetricsScreen from '../screens/BodyMetricsScreen'
import PreferencesScreen from '../screens/PreferencesScreen'
import AdminUsersScreen from '../screens/AdminUsersScreen'
import WorkoutOverlay from '../screens/WorkoutOverlay'

const Stack = createNativeStackNavigator()

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#0d1117' },
  freezeOnBlur: true,
}

export default function AppStack() {
  useRestoreActiveSession()

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name="Home" component={HomeScreen} />

        {/* Rutinas */}
        <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} />
        <Stack.Screen name="NewRoutine" component={NewRoutineScreen} />

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

      <WorkoutOverlay />
    </View>
  )
}
