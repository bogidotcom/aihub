export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null

export function initTelegram() {
  try { tg?.ready(); tg?.expand() } catch { /* noop */ }
}

export const isTelegram = () => !!(tg && tg.initData)

export function openTelegramLink(url) {
  if (tg?.openTelegramLink) tg.openTelegramLink(url)
  else window.open(url, '_blank', 'noopener')
}
