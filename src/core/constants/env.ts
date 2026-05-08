import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_VAPID_PUBLIC_KEY: z.string().optional(),
  VITE_NOTIFY_HOOK_URL: z.string().url().optional(),
  VITE_NOTIFICATIONS_ENABLED: z
    .string()
    .optional()
    .transform(v => v === 'true'),
})

/** Validated environment variables. Use this instead of `import.meta.env` directly. */
export const env = envSchema.parse(import.meta.env)
