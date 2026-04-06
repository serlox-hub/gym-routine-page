import { useState, useCallback } from 'react'
import * as Sharing from 'expo-sharing'
import { getNotifier, t } from '@gym/shared'

export function useShareWorkoutSummary() {
  const [isGenerating, setIsGenerating] = useState(false)

  const generateAndShare = useCallback(async (viewShotRef, _date) => {
    if (!viewShotRef?.capture || isGenerating) return
    setIsGenerating(true)
    try {
      const uri = await viewShotRef.capture()

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: t('workout:share.dialogTitle'),
      })
    } catch (err) {
      getNotifier()?.show(`Error al compartir: ${err.message}`, 'error')
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating])

  return { generateAndShare, isGenerating }
}
