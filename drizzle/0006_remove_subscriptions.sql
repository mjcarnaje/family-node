-- Remove Stripe subscription fields from user table
-- App is now completely free with unlimited features

ALTER TABLE "user" DROP COLUMN IF EXISTS "stripe_customer_id";
ALTER TABLE "user" DROP COLUMN IF EXISTS "subscription_id";
ALTER TABLE "user" DROP COLUMN IF EXISTS "plan";
ALTER TABLE "user" DROP COLUMN IF EXISTS "subscription_status";
ALTER TABLE "user" DROP COLUMN IF EXISTS "subscription_expires_at";
