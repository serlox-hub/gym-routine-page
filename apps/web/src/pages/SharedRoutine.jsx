import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  buildSharedRoutinePreview,
  useImportSharedRoutine,
  useMuscleGroups,
  useSharedRoutine,
} from '@gym/shared'
import { useAuth } from '../hooks/useAuth.js'
import { BottomActions, Button, ErrorMessage, LoadingSpinner, PageHeader } from '../components/ui/index.js'
import SharedRoutinePreview from '../components/Routine/SharedRoutinePreview.jsx'
import { savePendingSharedRoutinePath, takePendingSharedRoutinePath } from '../lib/pendingSharedRoutine.js'
import { colors } from '../lib/styles.js'

/**
 * Public page of a shared routine (`/r/:token`), with or without a session. Logged in, it imports a
 * copy. Logged out, it sends the visitor to sign up or log in and remembers this path, so home takes
 * them back here once they have a session (see `HomeOrLanding`).
 */
function SharedRoutine() {
  const { token } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { data, isLoading, isError, refetch, isFetching } = useSharedRoutine(token)
  const { data: muscleGroups } = useMuscleGroups()
  const importShared = useImportSharedRoutine()
  const preview = useMemo(() => (data ? buildSharedRoutinePreview(data) : null), [data])

  // Back here with a session: the way back is used up, or a later visit to home would bring it again
  useEffect(() => {
    if (isAuthenticated) takePendingSharedRoutinePath()
  }, [isAuthenticated])

  const handleImport = async () => {
    try {
      const routine = await importShared.mutateAsync({ token })
      navigate(`/routine/${routine.id}`)
    } catch {
      // Notified by the hook (or the page turns into the dead-link state)
    }
  }

  const leaveTo = (path) => {
    savePendingSharedRoutinePath(`/r/${token}`)
    navigate(path)
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-3">
        <ErrorMessage message={t('routine:shareLink.loadError')} />
        <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <LoadingSpinner inline /> : t('common:buttons.retry')}
        </Button>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.bgPrimary }}>
        <div className="w-full max-w-sm text-center flex flex-col gap-3">
          <h1 className="text-xl font-bold" style={{ color: colors.textPrimary }}>{t('routine:shareLink.deadLinkTitle')}</h1>
          <p className="text-sm" style={{ color: colors.textSecondary }}>{t('routine:shareLink.deadLinkMessage')}</p>
          <Button variant="secondary" onClick={() => navigate('/')}>{t('routine:shareLink.goHome')}</Button>
        </div>
      </div>
    )
  }

  // While auth is unknown there is no action to offer: "import" and "create an account" are both
  // wrong for half the visitors (CLAUDE.md, "no lo sé todavía" no es "no").
  let actions = null
  if (!isAuthLoading && isAuthenticated) {
    actions = {
      primary: {
        label: importShared.isPending
          ? <span className="flex items-center justify-center gap-2"><LoadingSpinner inline />{t('routine:shareLink.importing')}</span>
          : t('routine:shareLink.import'),
        onClick: handleImport,
        disabled: importShared.isPending,
      },
    }
  } else if (!isAuthLoading) {
    actions = {
      primary: { label: t('routine:shareLink.signupToImport'), onClick: () => leaveTo('/signup') },
      secondary: { label: t('routine:shareLink.loginToImport'), onClick: () => leaveTo('/login') },
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-28">
      {/* The page hides the tab bar: with a session this is the way into the app without importing.
          It goes home, not back: opened from a chat, "back" is the chat. */}
      {isAuthenticated && <PageHeader title="" onBack={() => navigate('/')} />}
      <SharedRoutinePreview preview={preview} muscleGroups={muscleGroups} />
      {actions && <BottomActions {...actions} />}
    </div>
  )
}

export default SharedRoutine
