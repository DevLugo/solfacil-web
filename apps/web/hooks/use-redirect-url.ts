const REDIRECT_KEY = 'auth_redirect_url'

export function saveRedirectUrl(url: string): void {
  if (typeof window === 'undefined') return
  // Don't save login page as redirect target
  if (url === '/login' || url.startsWith('/login')) return
  sessionStorage.setItem(REDIRECT_KEY, url)
}

export function getRedirectUrl(): string | null {
  if (typeof window === 'undefined') return null
  const url = sessionStorage.getItem(REDIRECT_KEY)
  sessionStorage.removeItem(REDIRECT_KEY)
  return url
}

export function clearRedirectUrl(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(REDIRECT_KEY)
}
