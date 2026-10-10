// React Router keeps the entry's position in `history.state.idx` (0 = the app's first entry, kept on
// replace). With nothing of ours behind, `navigate(-1)` leaves the app: a blank tab, or nothing at
// all in an installed PWA. Happens when a screen is opened directly (reload, link, PWA resume).
export function hasAppHistoryBehind() {
  return (window.history.state?.idx ?? 0) > 0
}

// The one guarded `navigate(-1)` of the web app (lint bans the bare call elsewhere).
export function goBack(navigate, fallbackTo) {
  // eslint-disable-next-line no-restricted-syntax -- guarded by hasAppHistoryBehind()
  if (hasAppHistoryBehind()) navigate(-1)
  else navigate(fallbackTo, { replace: true })
}
