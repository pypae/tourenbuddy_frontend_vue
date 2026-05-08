# tourenbuddy-email-hook

Cloudflare Worker implementing the Supabase "Send Email Hook". Receives Supabase auth email payloads via HMAC-verified webhook, picks a Brevo transactional template based on the user's locale, and sends the OTP code email.

See implementation spec: `../../openspec/changes/switch-auth-to-otp/`

## Brevo templates

Create two Brevo transactional templates: **Transactional → Templates → Create a template**.

| Template name | Subject (Brevo)                 | Language |
| ------------- | ------------------------------- | -------- |
| `otp_en`      | `Your TourenBuddy sign-in code` | EN       |
| `otp_de`      | `Dein TourenBuddy-Anmeldecode`  | DE       |

- Sender: `no-reply@tourenbuddy.ch`
- Note the numeric `templateId` from the template detail page — you need it for `BREVO_TEMPLATE_EN` / `BREVO_TEMPLATE_DE`.

Required template params (passed by Worker):

- `{{ params.otp }}` — the 6-digit sign-in code
- `{{ params.email }}` — the recipient's email address

Include a "Do not share this code. It expires in 1 hour." warning in the template body.

## Secrets

Set all secrets via Wrangler before deploying:

```sh
wrangler secret put BREVO_API_KEY
wrangler secret put SEND_EMAIL_HOOK_SECRET
wrangler secret put BREVO_TEMPLATE_EN   # numeric ID of otp_en template
wrangler secret put BREVO_TEMPLATE_DE   # numeric ID of otp_de template
```

No `[vars]` configuration required in `wrangler.toml`.

## Deploy

```sh
npm install
wrangler login
wrangler deploy
```

Note the Worker URL from the deploy output — you need it to configure the Supabase Send Email Hook.

## Local dev

```sh
wrangler dev
```

## Notification routes

Two additional routes handle friend-request push + email dispatch. See `SETUP-NOTIFICATIONS.md` for full operator setup.

### `POST /notify/friend-request-received`

Called by the client after successfully sending a friend request.

**Request**

```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
{ "friendshipId": "<uuid>" }
```

**Behaviour**

- Verifies JWT; rejects 401 if missing/invalid.
- Loads friendship row; rejects 403 if caller is not `request_user_id`.
- Fetches recipient prefs + subscriptions via service role.
- Skips all dispatch if `friend_requests` is in `notif_muted_types`.
- Dispatches Web Push to every registered browser of the recipient (cleans up 410/404 endpoints).
- Sends Brevo email using the locale-matching template (`BREVO_TEMPLATE_FRIEND_RECEIVED_EN/DE`).

### `POST /notify/friend-request-responded`

Called by the client after accepting or declining a friend request.

**Request**

```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
{ "friendshipId": "<uuid>" }
```

**Behaviour**

- Same as above but caller must be `response_user_id`.
- Notifies the original sender (requester).
- Notification body never reveals accept vs decline.

### Brevo friend-request templates

| Secret name                          | Template purpose                  |
| ------------------------------------ | --------------------------------- |
| `BREVO_TEMPLATE_FRIEND_RECEIVED_EN`  | "New friend request" — English    |
| `BREVO_TEMPLATE_FRIEND_RECEIVED_DE`  | "New friend request" — German     |
| `BREVO_TEMPLATE_FRIEND_RESPONDED_EN` | "Friend request update" — English |
| `BREVO_TEMPLATE_FRIEND_RESPONDED_DE` | "Friend request update" — German  |

Template params: `{{ params.actorName }}`, `{{ params.appUrl }}`

Copy-ready HTML and TXT drafts are in `brevo-templates/`.

## Notification setup

For full operator setup instructions (VAPID generation, Brevo template creation, secrets, migration, env vars), see [SETUP-NOTIFICATIONS.md](./SETUP-NOTIFICATIONS.md).

## Tests

```sh
npm test
```
