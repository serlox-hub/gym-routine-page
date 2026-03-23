import { useState, useCallback } from 'react'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import { getNotifier } from '@gym/shared'

export function useShareWorkoutSummary() {
  const [isGenerating, setIsGenerating] = useState(false)

  const generateAndShare = useCallback(async (viewShotRef, _date) => {
    if (!viewShotRef?.capture || isGenerating) return
    setIsGenerating(true)
    try {
      const uri = await viewShotRef.capture()
      const uniqueUri = `${FileSystem.cacheDirectory}workout-${Date.now()}.png`
      await FileSystem.moveAsync({ from: uri, to: uniqueUri })

      await Sharing.shareAsync(uniqueUri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartir entrenamiento',
      })

      FileSystem.deleteAsync(uniqueUri, { idempotent: true })
    } catch (err) {
      getNotifier()?.show(`Error al compartir: ${err.message}`, 'error')
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating])

  return { generateAndShare, isGenerating }
}
