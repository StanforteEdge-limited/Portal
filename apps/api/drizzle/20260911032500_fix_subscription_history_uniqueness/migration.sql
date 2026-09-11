DROP INDEX IF EXISTS "tenant_subscription_unique_active";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_subscription_one_current_idx"
  ON "sta_tenant_subscriptions" ("tenant_id")
  WHERE "status" IN ('active', 'trialing', 'past_due');
