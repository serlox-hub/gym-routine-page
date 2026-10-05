import { useState } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, Share } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Pencil, Download, Trash2, Copy, ClipboardCopy, Link2, Link2Off, Share2 } from 'lucide-react-native'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as Clipboard from 'expo-clipboard'
import Toast from 'react-native-toast-message'
import { useDuplicateRoutine, useRoutineDetailsForm } from '../../hooks/useRoutines'
import { sanitizeFilename, exportRoutine, formatRoutineAsText, buildRoutineShareUrl, useEnableRoutineShare, useDisableRoutineShare } from '@gym/shared'
import { colors, design } from '../../lib/styles'
import { ConfirmModal, ErrorMessage, Modal, PageHeader } from '../ui'
import CreateShareLinkModal from './CreateShareLinkModal'

// A share link opens the WEB page (`/r/:token`): native does not handle incoming links yet (see
// docs/store-release.md). Without the web origin there is no link to build, so the share actions
// are hidden instead of producing a broken one.
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL
if (!WEB_URL && __DEV__) {
  // eslint-disable-next-line no-console -- dev-only hint for a missing env var, never in a release build
  console.warn('EXPO_PUBLIC_WEB_URL is not set: the routine share actions are hidden (see .env.example).')
}

export function RoutineEditForm({ routine, routineId, onClose }) {
  const { t } = useTranslation()
  const { form, setField, error, submit, isSaving } = useRoutineDetailsForm(routine, routineId)

  const handleSave = async () => {
    if (await submit()) onClose?.()
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <View style={{ padding: 20, gap: 16 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{t('routine:editDetails')}</Text>
        <View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>
            {t('routine:name')}
          </Text>
          <TextInput
            value={form.name}
            onChangeText={(v) => setField('name', v)}
            placeholder={t('routine:namePlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14 }}
          />
        </View>
        <View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginBottom: 6 }}>
            {t('routine:description')}
          </Text>
          <TextInput
            value={form.description}
            onChangeText={(v) => setField('description', v)}
            placeholder={t('routine:descriptionPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline numberOfLines={2}
            style={{ backgroundColor: colors.bgTertiary, color: colors.textPrimary, borderRadius: 12, padding: 14, fontSize: 14, textAlignVertical: 'top', minHeight: 60 }}
          />
        </View>
        {error ? <ErrorMessage message={error} /> : null}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={onClose}
            style={{ flex: 1, minHeight: design.minTouchTarget, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{t('common:buttons.cancel')}</Text>
          </Pressable>
          <Pressable
            onPress={handleSave} disabled={isSaving}
            style={{ flex: 1, minHeight: design.minTouchTarget, backgroundColor: colors.success, borderRadius: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', opacity: isSaving ? 0.4 : 1 }}
          >
            <Text style={{ color: colors.bgPrimary, fontSize: 14, fontWeight: '600' }}>
              {isSaving ? t('common:buttons.loading') : t('common:buttons.save')}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

export default function RoutineHeader({ routine, routineId, navigation, onDelete, initialDetailsOpen = false }) {
  const { t } = useTranslation()
  const duplicateRoutine = useDuplicateRoutine()
  // Una rutina recién creada llega con el nombre por defecto: se abre el modal para que no pase
  // desapercibido. Solo el valor inicial, que la pantalla limpia la señal en cuanto la lee.
  const [showDetails, setShowDetails] = useState(initialDetailsOpen)
  const [shareConfirm, setShareConfirm] = useState(null) // 'create' | 'stop' | null
  // Token of a link just created: the create modal's second step, one tap from sharing it
  const [readyToken, setReadyToken] = useState(null)
  const [shareErrorKey, setShareErrorKey] = useState(null)
  const enableShare = useEnableRoutineShare()
  const disableShare = useDisableRoutineShare()

  const notifyError = (key) => Toast.show({ type: 'error', text1: t(key) })

  // Built from a token already in memory (the routine's, or the one just created), like the web,
  // where Safari needs it inside the tap. `onError` gets the i18n key of a failure: a toast by
  // default, inline when called from a modal (a toast paints under a React Native Modal).
  const handleShareLink = (token = routine.share_token, onError = notifyError) => {
    Share.share({ message: buildRoutineShareUrl(WEB_URL, token) }).catch(() => onError('routine:shareLink.shareFailed'))
  }

  const handleCreateShare = async () => {
    try {
      setReadyToken(await enableShare.mutateAsync({ routineId }))
    } catch {
      // Notified by the hook, once this modal is closed
      setShareConfirm(null)
    }
  }

  const closeCreateShare = () => {
    setShareConfirm(null)
    setReadyToken(null)
    setShareErrorKey(null)
  }

  const handleStopShare = async () => {
    try {
      await disableShare.mutateAsync({ routineId })
    } catch {
      // Notified by the hook
    }
    setShareConfirm(null)
  }

  const shareItems = !WEB_URL ? [] : routine?.share_token
    ? [
      { icon: Share2, label: t('routine:shareLink.share'), onClick: () => handleShareLink() },
      { icon: Link2Off, label: t('routine:shareLink.stop'), onClick: () => setShareConfirm('stop') },
    ]
    : [{ icon: Link2, label: t('routine:shareLink.createLink'), onClick: () => setShareConfirm('create') }]

  const handleDuplicate = async () => {
    // Sin guard, un segundo tap durante la espera (importRoutine carga el catálogo
    // de ejercicios, puede tardar) crea copias de más.
    if (duplicateRoutine.isPending) return
    Toast.show({ type: 'loading', text1: t('routine:duplicating'), autoHide: false })
    try {
      const newRoutine = await duplicateRoutine.mutateAsync({ routineId: parseInt(routineId) })
      // Éxito notificado por el propio hook (useDuplicateRoutine), sustituye el toast de carga
      navigation.replace('RoutineDetail', { routineId: newRoutine.id })
    } catch {
      // Error notificado por el propio hook (useDuplicateRoutine)
    }
  }

  const handleExport = async () => {
    try {
      const data = await exportRoutine(parseInt(routineId))
      const json = JSON.stringify(data, null, 2)
      const filename = sanitizeFilename(routine?.name || 'rutina') + '.json'
      const file = new File(Paths.cache, filename)
      file.write(json)
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: t('common:buttons.export') })
    } catch {
      Toast.show({ type: 'error', text1: t('routine:exportError') })
    }
  }

  const handleCopyAsText = async () => {
    try {
      const data = await exportRoutine(parseInt(routineId))
      const text = formatRoutineAsText(data)
      await Clipboard.setStringAsync(text)
      Toast.show({ type: 'success', text1: t('routine:copiedToClipboard') })
    } catch {
      Toast.show({ type: 'error', text1: t('routine:copyAsTextFailed') })
    }
  }

  const menuItems = [
    { icon: Pencil, label: t('routine:editDetails'), onClick: () => setShowDetails(true) },
    { icon: Copy, label: t('routine:duplicate'), onClick: handleDuplicate },
    { icon: ClipboardCopy, label: t('routine:copyAsText'), onClick: handleCopyAsText },
    ...shareItems,
    { icon: Download, label: t('common:buttons.export'), onClick: handleExport },
    { icon: Trash2, label: t('common:buttons.delete'), onClick: onDelete, danger: true },
  ]

  return (
    <>
      <PageHeader
        title=""
        menuItems={menuItems}
      />
      <CreateShareLinkModal
        isOpen={shareConfirm === 'create'}
        url={readyToken ? buildRoutineShareUrl(WEB_URL, readyToken) : null}
        isCreating={enableShare.isPending}
        shareErrorKey={shareErrorKey}
        onCreate={handleCreateShare}
        onShare={() => {
          setShareErrorKey(null)
          handleShareLink(readyToken, setShareErrorKey)
        }}
        onClose={closeCreateShare}
      />
      <ConfirmModal
        isOpen={shareConfirm === 'stop'}
        title={t('routine:shareLink.stopConfirmTitle')}
        message={t('routine:shareLink.stopConfirmMessage')}
        confirmText={t('routine:shareLink.stop')}
        isLoading={disableShare.isPending}
        onConfirm={handleStopShare}
        onCancel={() => setShareConfirm(null)}
      />
      {/* El form se monta solo mientras el modal está abierto: así se siembra una vez por
          apertura y un refetch de `routine` de fondo no pisa lo que se está escribiendo. */}
      <Modal isOpen={showDetails} onClose={() => setShowDetails(false)} position="bottom">
        <RoutineEditForm routine={routine} routineId={routineId} onClose={() => setShowDetails(false)} />
      </Modal>
    </>
  )
}
