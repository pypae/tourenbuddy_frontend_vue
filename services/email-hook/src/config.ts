export interface Env {
  // Existing OTP email secrets
  BREVO_API_KEY: string
  SEND_EMAIL_HOOK_SECRET: string
  BREVO_TEMPLATE_EN: string
  BREVO_TEMPLATE_DE: string

  // Notification secrets
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  VAPID_SUBJECT: string
  BREVO_TEMPLATE_FRIEND_RECEIVED_EN: string
  BREVO_TEMPLATE_FRIEND_RECEIVED_DE: string
  BREVO_TEMPLATE_FRIEND_RESPONDED_EN: string
  BREVO_TEMPLATE_FRIEND_RESPONDED_DE: string
}

export const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

export function jsonResponse(status: number, body: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export function resolveLocale(locale: string | null | undefined): 'en' | 'de' {
  return locale === 'de' || locale === 'de-CH' ? 'de' : 'en'
}
