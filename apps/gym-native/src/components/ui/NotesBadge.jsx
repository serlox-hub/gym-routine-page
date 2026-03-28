import { View, Text, Pressable } from 'react-native'
import { FileText, Video, AlertCircle } from 'lucide-react-native'
import { colors } from '../../lib/styles'

const RIR_LABELS = {
  [-1]: 'F',
  0: '0',
  1: '1',
  2: '2',
  3: '3+',
}

export default function NotesBadge({
  rir,
  hasNotes,
  hasVideo,
  isUploadingVideo,
  uploadProgress = 0,
  videoUploadError,
  onRetryUpload,
  onPress,
}) {
  const hasRir = rir !== null && rir !== undefined

  if (!hasRir && !hasNotes && !hasVideo && !isUploadingVideo && !videoUploadError) return null

  const bgColor = videoUploadError
    ? colors.dangerBg
    : colors.purpleBg

  const content = (
    <>
      {hasRir && (
        <Text className="text-xs font-bold" style={{ color: colors.purple }}>
          {RIR_LABELS[rir] ?? rir}
        </Text>
      )}
      {hasNotes && <FileText size={12} color={colors.purple} />}
      {videoUploadError ? (
        <Pressable onPress={onRetryUpload}>
          <AlertCircle size={12} color={colors.danger} />
        </Pressable>
      ) : isUploadingVideo ? (
        <Text className="text-xs font-medium" style={{ color: colors.purple }}>
          {uploadProgress}%
        </Text>
      ) : hasVideo ? (
        <Video size={12} color={colors.purple} />
      ) : null}
    </>
  )

  const Component = onPress ? Pressable : View

  return (
    <Component
      onPress={onPress}
      className="flex-row items-center gap-1 px-1.5 py-0.5 rounded"
      style={{ backgroundColor: bgColor }}
    >
      {content}
    </Component>
  )
}
