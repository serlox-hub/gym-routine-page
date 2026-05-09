import { Platform, Linking } from 'react-native'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { t } from '@gym/shared'

const ANDROID_CHANNEL_ID = 'rest-timer'
const SCHEDULED_ID_KEY = 'rest-timer-end'
export const REST_NOTIFICATIONS_ENABLED_KEY = 'rest_notifications_enabled'

let scheduledNotificationId = null

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
}

export async function setupAndroidChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Temporizador de descanso',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 200, 100, 200],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  })
}

export async function getNotificationPermissionStatus() {
  return Notifications.getPermissionsAsync()
}

export async function requestNotificationPermission() {
  return Notifications.requestPermissionsAsync()
}

export function openNotificationSettings() {
  Linking.openSettings()
}

async function isFeatureEnabled() {
  const saved = await AsyncStorage.getItem(REST_NOTIFICATIONS_ENABLED_KEY)
  return saved === null || saved === 'true'
}

export async function scheduleRestEndNotification(endTime) {
  if (!endTime) return
  const secondsUntil = (endTime - Date.now()) / 1000
  if (secondsUntil <= 1) return

  if (!(await isFeatureEnabled())) return

  const permission = await Notifications.getPermissionsAsync()
  if (!permission.granted) return

  await cancelRestEndNotification()

  scheduledNotificationId = await Notifications.scheduleNotificationAsync({
    identifier: SCHEDULED_ID_KEY,
    content: {
      title: t('workout:rest.notificationTitle'),
      body: t('workout:rest.notificationBody'),
      sound: 'default',
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(endTime),
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
  })
}

export async function cancelRestEndNotification() {
  if (!scheduledNotificationId) return
  try {
    await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId)
  } catch {
    // Ya pudo dispararse o cancelarse
  }
  scheduledNotificationId = null
}
