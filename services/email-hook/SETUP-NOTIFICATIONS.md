# Notification Setup Checklist

Follow these steps in order to enable push and email notifications for friend requests.

## Security audit note

The Web Push library used in this Worker (`@block65/webcrypto-web-push` v1.0.2) was vetted against:

- `npm audit --omit=dev` → 0 vulnerabilities in production deps
- GitHub Advisory Database → no advisories
- socket.dev → maintained, last published Dec 2024, MIT licence

## 1. Generate VAPID keypair

```sh
npx web-push generate-vapid-keys
```

Copy the output — you will need both `publicKey` and `privateKey` in step 3.

## 2. Create Brevo transactional templates

Go to **Brevo → Transactional → Email Templates → Create a template**.

Create four templates by pasting the corresponding files from `brevo-templates/`:

| File                                        | Template name (suggestion)    | Note                                    |
| ------------------------------------------- | ----------------------------- | --------------------------------------- |
| `friend_request_received_en.html` + `.txt`  | `friend_request_received_en`  | Subject line is in the HTML top comment |
| `friend_request_received_de.html` + `.txt`  | `friend_request_received_de`  |                                         |
| `friend_request_responded_en.html` + `.txt` | `friend_request_responded_en` | Never reveals accept/decline            |
| `friend_request_responded_de.html` + `.txt` | `friend_request_responded_de` |                                         |

For each template:

1. Create template, paste HTML into the HTML editor and TXT into the plain-text editor.
2. Set sender to `no-reply@tourenbuddy.ch`.
3. Save and **activate** the template.
4. Note the numeric **Template ID** from the URL or template details page.

## 3. Set Worker secrets

```sh
cd services/email-hook

# Supabase
wrangler secret put SUPABASE_URL
# → paste: https://<your-project>.supabase.co

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# → paste service role key from Supabase project settings

# VAPID (from step 1)
wrangler secret put VAPID_PUBLIC_KEY
wrangler secret put VAPID_PRIVATE_KEY
wrangler secret put VAPID_SUBJECT
# → paste: mailto:no-reply@tourenbuddy.ch

# Brevo template IDs (numeric, from step 2)
wrangler secret put BREVO_TEMPLATE_FRIEND_RECEIVED_EN
wrangler secret put BREVO_TEMPLATE_FRIEND_RECEIVED_DE
wrangler secret put BREVO_TEMPLATE_FRIEND_RESPONDED_EN
wrangler secret put BREVO_TEMPLATE_FRIEND_RESPONDED_DE
```

## 4. Apply Supabase migration

```sh
supabase db push
```

This adds `notif_push_enabled`, `notif_email_enabled`, `notif_muted_types` columns to `user_profile`
and creates the `push_subscriptions` table with RLS.

## 5. Set frontend environment variables

In **Cloudflare Pages → Settings → Environment variables** (and in your local `.env.local`):

```
VITE_VAPID_PUBLIC_KEY=<publicKey from step 1>
VITE_NOTIFY_HOOK_URL=https://tourenbuddy-email-hook.<your-account>.workers.dev
VITE_NOTIFICATIONS_ENABLED=true
```

## 6. Deploy

```sh
# Deploy Worker
cd services/email-hook && wrangler deploy

# Deploy frontend (triggers Cloudflare Pages build)
git push
```

## 7. Rollback

If notifications cause issues, disable dispatch without touching the database:

1. Set `VITE_NOTIFICATIONS_ENABLED=false` in Cloudflare Pages environment variables.
2. Trigger a redeploy (empty commit or Pages dashboard redeploy button).

The `push_subscriptions` table and user preference columns remain — re-enable is instant.
