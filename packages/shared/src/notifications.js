let _notifier = null

export function initNotifications(showToast) {
  _notifier = { show: showToast }
}

export function getNotifier() {
  return _notifier
}
