import type { Env } from './config'
import { verifySupabaseJwt } from './auth'
import { jsonResponse } from './config'
import { sendFriendNotificationEmail } from './email'
import { dispatchPushToUser } from './push'

interface FriendshipRow {
  id: string
  request_user_id: string
  response_user_id: string
}

interface UserProfileRow {
  id: string
  notif_push_enabled: boolean
  notif_email_enabled: boolean
  notif_muted_types: string[]
  locale: string | null
}

interface AuthUserRow {
  id: string
  email: string
}

async function fetchFriendship(friendshipId: string, env: Env): Promise<FriendshipRow | null> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/friendships?id=eq.${encodeURIComponent(friendshipId)}&select=id,request_user_id,response_user_id`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  )
  if (!res.ok)
    return null
  const rows = (await res.json()) as FriendshipRow[]
  return rows[0] ?? null
}

async function fetchUserProfile(userId: string, env: Env): Promise<UserProfileRow | null> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/user_profile?id=eq.${encodeURIComponent(userId)}&select=id,notif_push_enabled,notif_email_enabled,notif_muted_types,locale`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  )
  if (!res.ok)
    return null
  const rows = (await res.json()) as UserProfileRow[]
  return rows[0] ?? null
}

async function fetchUserEmail(userId: string, env: Env): Promise<string | null> {
  const res = await fetch(
    `${env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  )
  if (!res.ok)
    return null
  const user = (await res.json()) as AuthUserRow
  return user.email ?? null
}

async function fetchActorDisplayName(actorId: string, env: Env): Promise<string> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/user_profile?id=eq.${encodeURIComponent(actorId)}&select=first_name,last_name`,
    {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  )
  if (!res.ok)
    return 'Someone'
  const rows = (await res.json()) as Array<{ first_name: string | null, last_name: string | null }>
  const row = rows[0]
  if (!row)
    return 'Someone'
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ')
  return name || 'Someone'
}

const APP_URL = 'https://app.tourenbuddy.ch'
const FRIEND_REQUESTS_MUTE_TYPE = 'friend_requests'

async function dispatchToRecipient(
  recipientId: string,
  actorId: string,
  event: 'received' | 'responded',
  env: Env,
): Promise<void> {
  const [recipientProfile, actorName, recipientEmail] = await Promise.all([
    fetchUserProfile(recipientId, env),
    fetchActorDisplayName(actorId, env),
    fetchUserEmail(recipientId, env),
  ])

  if (!recipientProfile)
    return

  // Check if type is muted
  if (recipientProfile.notif_muted_types.includes(FRIEND_REQUESTS_MUTE_TYPE))
    return

  const pushTitle = event === 'received' ? 'New friend request' : 'Friend request update'
  const pushBody
    = event === 'received'
      ? `${actorName} wants to connect.`
      : `${actorName} responded to your request.`

  const dispatchTasks: Promise<void>[] = []

  if (recipientProfile.notif_push_enabled) {
    dispatchTasks.push(
      dispatchPushToUser(recipientId, { title: pushTitle, body: pushBody, url: `${APP_URL}/?friendRequests=1` }, env),
    )
  }

  if (recipientProfile.notif_email_enabled && recipientEmail) {
    dispatchTasks.push(
      sendFriendNotificationEmail(
        {
          toEmail: recipientEmail,
          locale: recipientProfile.locale,
          actorName,
          appUrl: APP_URL,
          event,
        },
        env,
      ),
    )
  }

  await Promise.all(dispatchTasks)
}

function hasNotifyConfig(env: Env): boolean {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT)
}

export async function handleFriendRequestReceived(request: Request, env: Env): Promise<Response> {
  if (!hasNotifyConfig(env))
    return jsonResponse(500, { error: 'missing_configuration' })

  const callerId = await verifySupabaseJwt(request, env)
  if (!callerId)
    return jsonResponse(401, { error: 'unauthorized' })

  let body: { friendshipId?: string }
  try {
    body = (await request.json()) as { friendshipId?: string }
  }
  catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }

  const { friendshipId } = body
  if (!friendshipId)
    return jsonResponse(400, { error: 'missing_friendship_id' })

  const friendship = await fetchFriendship(friendshipId, env)
  if (!friendship)
    return jsonResponse(404, { error: 'friendship_not_found' })

  // Caller must be the sender (request_user_id)
  if (friendship.request_user_id !== callerId)
    return jsonResponse(403, { error: 'forbidden' })

  await dispatchToRecipient(friendship.response_user_id, callerId, 'received', env)

  return jsonResponse(200)
}

export async function handleFriendRequestResponded(request: Request, env: Env): Promise<Response> {
  if (!hasNotifyConfig(env))
    return jsonResponse(500, { error: 'missing_configuration' })

  const callerId = await verifySupabaseJwt(request, env)
  if (!callerId)
    return jsonResponse(401, { error: 'unauthorized' })

  let body: { friendshipId?: string }
  try {
    body = (await request.json()) as { friendshipId?: string }
  }
  catch {
    return jsonResponse(400, { error: 'invalid_json' })
  }

  const { friendshipId } = body
  if (!friendshipId)
    return jsonResponse(400, { error: 'missing_friendship_id' })

  const friendship = await fetchFriendship(friendshipId, env)
  if (!friendship)
    return jsonResponse(404, { error: 'friendship_not_found' })

  // Caller must be the responder (response_user_id)
  if (friendship.response_user_id !== callerId)
    return jsonResponse(403, { error: 'forbidden' })

  await dispatchToRecipient(friendship.request_user_id, callerId, 'responded', env)

  return jsonResponse(200)
}
