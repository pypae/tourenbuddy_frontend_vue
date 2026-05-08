-- Add notification preference columns to user_profile
ALTER TABLE user_profile
  ADD COLUMN IF NOT EXISTS notif_push_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_muted_types text[] NOT NULL DEFAULT '{}';

-- Push subscriptions table for Web Push (VAPID)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
