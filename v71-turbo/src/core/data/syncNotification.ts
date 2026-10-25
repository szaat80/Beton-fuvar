export function showSyncNotification(title: string, message: string): void {
  if (window.desktopFiles?.notifyDataChange) {
    void window.desktopFiles.notifyDataChange(title, message).catch((error: unknown) => {
      console.error('Nem sikerült megjeleníteni az asztali szinkronértesítést.', error)
      showToast(`${message} (Az asztali értesítés nem jelent meg.)`)
    })
    return
  }
  showToast(message)
}

function showToast(message: string): void {
  let toast = document.getElementById('sync-notification')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'sync-notification'
    toast.className = 'sync-notification'
    toast.setAttribute('role', 'status')
    toast.setAttribute('aria-live', 'polite')
    document.body.append(toast)
  }
  toast.textContent = message
  toast.hidden = false
  window.clearTimeout(Number(toast.dataset.timeout))
  toast.dataset.timeout = String(window.setTimeout(() => {
    toast.hidden = true
  }, 8000))
}
