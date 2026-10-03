# Pending for the store release (native apps)

The native apps are not published yet: only the web is in production. This is the checklist of what
has to be done before an iOS or Android build goes to the stores. Each entry says why it is pending.

## 1. Open routine share links in the app

A share link is `<web origin>/r/<token>` (issues #139 and #140). Today it always opens the web page,
on every device, because native does not handle incoming links. To open it in the app instead:

- iOS Universal Links: add the associated domain (`applinks:<web domain>`) to the app config and
  serve `apple-app-site-association` from the web domain.
- Android App Links: add an `intentFilters` entry with `autoVerify: true` for `https://<web domain>/r/*`
  and serve `.well-known/assetlinks.json` from the web domain.
- A native route for `/r/:token` that does what `apps/web/src/pages/SharedRoutine.jsx` does: show
  the routine and import it (`useSharedRoutine`, `useImportSharedRoutine` from `@gym/shared`).

Until then the link still works from a phone: it opens the web, where the visitor can import it.

## 2. Set `EXPO_PUBLIC_WEB_URL` in the EAS build profiles

The routine header builds the share link from `EXPO_PUBLIC_WEB_URL` (the web origin, no trailing
slash). Without it the share actions are hidden, so a store build without the variable silently has
no way to share a routine. Declared in `apps/gym-native/.env.example`.
