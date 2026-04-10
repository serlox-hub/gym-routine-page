import { View, Text, Pressable, Animated } from 'react-native'
import { useEffect, useRef, useState } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { House, TimerReset, ClipboardList, Activity } from 'lucide-react-native'
import { useRestoreActiveSession, useSyncPendingSets } from '../hooks/useWorkout'
import HomeScreen from '../screens/HomeScreen'
import RoutinesScreen from '../screens/RoutinesScreen'
import HistoryScreen from '../screens/HistoryScreen'
import BodyMetricsScreen from '../screens/BodyMetricsScreen'
import RoutineDetailScreen from '../screens/RoutineDetailScreen'
import NewRoutineScreen from '../screens/NewRoutineScreen'
import ExercisesScreen from '../screens/ExercisesScreen'
import ExerciseProgressScreen from '../screens/ExerciseProgressScreen'
import PreferencesScreen from '../screens/PreferencesScreen'
import AdminUsersScreen from '../screens/AdminUsersScreen'
import WorkoutOverlay from '../screens/WorkoutOverlay'
import OfflineBanner from '../components/ui/OfflineBanner'
import { colors, design } from '../lib/styles'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

const TAB_CONFIG = [
  { name: 'Home', icon: House, labelKey: 'common:nav.home' },
  { name: 'History', icon: TimerReset, labelKey: 'common:nav.history' },
  { name: 'Routines', icon: ClipboardList, labelKey: 'common:nav.routines' },
  { name: 'BodyMetrics', icon: Activity, labelKey: 'common:nav.body' },
]

const stackScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.bgPrimary },
  freezeOnBlur: true,
}

function CustomTabBar({ state, navigation }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const slideAnim = useRef(new Animated.Value(state.index)).current
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: state.index,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start()
  }, [state.index, slideAnim])

  const tabCount = TAB_CONFIG.length
  const pillPadding = design.tabBarPadding
  const tabWidth = containerWidth > 0 ? (containerWidth - pillPadding * 2) / tabCount : 0

  const pillTranslateX = slideAnim.interpolate({
    inputRange: TAB_CONFIG.map((_, i) => i),
    outputRange: TAB_CONFIG.map((_, i) => i * tabWidth),
  })

  return (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 21, paddingTop: 12, paddingBottom: Math.max(insets.bottom - 8, 4) }}>
      <View
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.bgSecondary,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: design.tabBarRadius,
          height: design.tabBarHeight,
          padding: pillPadding,
        }}
      >
        {/* Sliding pill */}
        {containerWidth > 0 && (
          <Animated.View style={{
            position: 'absolute',
            top: pillPadding,
            bottom: pillPadding,
            left: pillPadding,
            width: tabWidth,
            borderRadius: design.tabPillRadius,
            backgroundColor: colors.success,
            shadowColor: colors.success,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 8,
            transform: [{ translateX: pillTranslateX }],
          }} />
        )}

        {TAB_CONFIG.map((tab, index) => {
          const active = state.index === index
          const Icon = tab.icon
          return (
            <Pressable
              key={tab.name}
              onPress={() => navigation.navigate(tab.name)}
              style={{ flex: 1, height: '100%', borderRadius: design.tabPillRadius, alignItems: 'center', justifyContent: 'center', gap: 3, zIndex: 1 }}
            >
              <Icon size={18} color={active ? colors.bgPrimary : colors.textSecondary} />
              <Text style={{
                fontSize: design.tabFontSize,
                fontWeight: active ? '600' : '500',
                letterSpacing: design.tabLetterSpacing,
                color: active ? colors.bgPrimary : colors.textSecondary,
                textTransform: 'uppercase',
              }}>
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Routines" component={RoutinesScreen} />
      <Tab.Screen name="BodyMetrics" component={BodyMetricsScreen} />
    </Tab.Navigator>
  )
}

export default function AppStack() {
  useRestoreActiveSession()
  useSyncPendingSets()

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Stack.Navigator screenOptions={stackScreenOptions}>
        <Stack.Screen name="MainTabs" component={MainTabs} />

        {/* Rutinas */}
        <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} />
        <Stack.Screen name="NewRoutine" component={NewRoutineScreen} />

        {/* Detalle */}
        <Stack.Screen name="Exercises" component={ExercisesScreen} />
        <Stack.Screen name="ExerciseProgress" component={ExerciseProgressScreen} />
        <Stack.Screen name="Preferences" component={PreferencesScreen} />
        <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      </Stack.Navigator>

      <WorkoutOverlay />
    </View>
  )
}
