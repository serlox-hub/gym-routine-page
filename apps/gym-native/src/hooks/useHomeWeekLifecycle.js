import { useCallback } from 'react'
import { AppState } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useHomeWeekLifecycle as _useHomeWeekLifecycle } from '@gym/shared'
import useWorkoutStore from '../stores/workoutStore.js'

const isWorkoutVisible = () => useWorkoutStore.getState().workoutVisible

/**
 * Home is a tab and stays mounted on the other tabs, so mounted is not visible: focus enters, blur
 * leaves. The app going to the background leaves too, but AppState is listened to only while Home
 * has focus: listened to for the whole mount, coming back to the app on History would enter Home
 * and restart the 15 minutes. The same focus/blur events as useFocusEffect, as plain listeners
 * because the shared hook owns the effect.
 *
 * The workout is an overlay over the tabs, not a screen (on web it is a route that unmounts Home),
 * so Home keeps focus under it: showing it leaves Home, hiding it enters only if Home is really on
 * screen. Without this, a workout started from a past week ends back on that week.
 */
export function useHomeWeekLifecycle() {
  const navigation = useNavigation()

  const subscribe = useCallback((onEnter, onLeave) => {
    let appStateSubscription = null
    const listenToAppState = () => {
      // The first focus event may arrive while Home is already focused and listening
      if (appStateSubscription) return
      appStateSubscription = AppState.addEventListener('change', (state) => {
        if (state !== 'active') onLeave()
        else if (!isWorkoutVisible()) onEnter()
      })
    }
    const stopListeningToAppState = () => {
      appStateSubscription?.remove()
      appStateSubscription = null
    }

    if (navigation.isFocused()) listenToAppState()
    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (!isWorkoutVisible()) onEnter()
      listenToAppState()
    })
    const unsubscribeBlur = navigation.addListener('blur', () => {
      stopListeningToAppState()
      onLeave()
    })
    const unsubscribeWorkout = useWorkoutStore.subscribe((state, previous) => {
      if (state.workoutVisible === previous.workoutVisible) return
      if (state.workoutVisible) onLeave()
      else if (navigation.isFocused() && AppState.currentState === 'active') onEnter()
    })
    // Mounted under an open workout (the end-of-workout navigation reset can remount Home)
    if (isWorkoutVisible()) onLeave()
    return () => {
      unsubscribeFocus()
      unsubscribeBlur()
      unsubscribeWorkout()
      stopListeningToAppState()
    }
  }, [navigation])

  _useHomeWeekLifecycle({ subscribe })
}
