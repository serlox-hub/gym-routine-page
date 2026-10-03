import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '../lib/constants.js'
import {
  SharedRoutineNotFoundError,
  enableRoutineShare,
  disableRoutineShare,
  fetchSharedRoutine,
  importSharedRoutine,
} from '../api/routineApi.js'
import { getNotifier } from '../notifications.js'
import { t } from '../i18n/index.js'
import { useUserId } from './useAuth.js'

// ============================================
// QUERIES
// ============================================

/** The shared routine behind a link, as export JSON; `data` is null for a dead link. Works without a session. */
export function useSharedRoutine(token) {
  return useQuery({
    queryKey: [QUERY_KEYS.SHARED_ROUTINE, token],
    queryFn: () => fetchSharedRoutine(token),
    enabled: !!token,
  })
}

// ============================================
// MUTATIONS
// ============================================

// The detail carries `share_token`, which decides the header actions; the list is invalidated
// for the same reason as any other change to a routine row. Returned so `onSuccess` waits for the
// refetch: the confirmation stays pending until then, or a menu opened right after it would still
// offer sharing a link that was just turned off.
function invalidateRoutine(queryClient, routineId) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINE, String(routineId)] }),
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] }),
  ])
}

export function useEnableRoutineShare() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ routineId }) => enableRoutineShare(routineId),
    onSuccess: (_, { routineId }) => invalidateRoutine(queryClient, routineId),
    onError: () => getNotifier()?.show(t('routine:shareLink.enableError'), 'error'),
  })
}

export function useDisableRoutineShare() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ routineId }) => disableRoutineShare(routineId),
    onSuccess: async (_, { routineId }) => {
      await invalidateRoutine(queryClient, routineId)
      getNotifier()?.show(t('routine:shareLink.stopped'), 'success')
    },
    onError: () => getNotifier()?.show(t('routine:shareLink.disableError'), 'error'),
  })
}

export function useImportSharedRoutine() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  return useMutation({
    mutationFn: ({ token }) => importSharedRoutine(token, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROUTINES] })
      getNotifier()?.show(t('routine:shareLink.imported'), 'success')
    },
    onError: (error, { token }) => {
      // The link died between opening it and pressing import: refetch so the page shows that state
      if (error instanceof SharedRoutineNotFoundError) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHARED_ROUTINE, token] })
        return
      }
      getNotifier()?.show(t('routine:shareLink.importError'), 'error')
    },
  })
}
