import { useState, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { buildSummaryFilename } from '@gym/shared'
import { colors } from '../lib/styles.js'

async function elementToBlob(element) {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: colors.bgPrimary,
    useCORS: false,
    logging: false,
  })
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: 'Mi entrenamiento',
    })
    return 'shared'
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}

export function useShareWorkoutSummary() {
  const [isGenerating, setIsGenerating] = useState(false)

  const generateAndShare = useCallback(async (element, date) => {
    if (!element || isGenerating) return null
    setIsGenerating(true)
    try {
      const blob = await elementToBlob(element)
      const filename = buildSummaryFilename(date)
      return await shareOrDownload(blob, filename)
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating])

  const generateAndDownload = useCallback(async (element, date) => {
    if (!element || isGenerating) return
    setIsGenerating(true)
    try {
      const blob = await elementToBlob(element)
      downloadBlob(blob, buildSummaryFilename(date))
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating])

  return { generateAndShare, generateAndDownload, isGenerating }
}
