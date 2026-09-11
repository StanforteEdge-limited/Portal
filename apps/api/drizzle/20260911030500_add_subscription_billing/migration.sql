CREATE TABLE IF NOT EXISTS "sta_subscription_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(120) NOT NULL,
  "description" varchar(500),
  "amount_minor" integer DEFAULT 0 NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN' NOT NULL,
  "interval" varchar(20) DEFAULT 'monthly' NOT NULL,
  "features" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp(6) DEFAULT now() NOT NULL,
  "updated_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plan_unique_code" ON "sta_subscription_plans" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sta_tenant_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" bigint NOT NULL,
  "plan_id" uuid NOT NULL,
  "status" varchar(30) DEFAULT 'active' NOT NULL,
  "starts_at" timestamp(6) DEFAULT now() NOT NULL,
  "ends_at" timestamp(6),
  "trial_ends_at" timestamp(6),
  "provider" varchar(30),
  "provider_subscription_id" varchar(255),
  "metadata" jsonb,
  "created_at" timestamp(6) DEFAULT now() NOT NULL,
  "updated_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_subscription_unique_active"
  ON "sta_tenant_subscriptions" ("tenant_id", "status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_subscription_provider_unique"
  ON "sta_tenant_subscriptions" ("provider", "provider_subscription_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_subscription_tenant_idx"
  ON "sta_tenant_subscriptions" ("tenant_id");
--> statement-breakpoint
ALTER TABLE "sta_tenant_subscriptions"
  ADD CONSTRAINT "tenant_subscription_tenant_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "sta_tenants" ("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "sta_tenant_subscriptions"
  ADD CONSTRAINT "tenant_subscription_plan_fk"
  FOREIGN KEY ("plan_id") REFERENCES "sta_subscription_plans" ("id") ON DELETE RESTRICT;
--> statement-breakpoint
INSERT INTO "sta_subscription_plans" ("code", "name", "description", "amount_minor", "currency", "interval", "features", "limits")
VALUES
  ('trial', 'Trial', 'Starter access for evaluation', 0, 'NGN', 'monthly', '{"core": true}'::jsonb, '{"members": 5, "organizations": 1}'::jsonb),
  ('starter', 'Starter', 'Core workspace features', 250000, 'NGN', 'monthly', '{"core": true, "finance": true}'::jsonb, '{"members": 25, "organizations": 5}'::jsonb),
  ('business', 'Business', 'Advanced workspace features', 750000, 'NGN', 'monthly', '{"core": true, "finance": true, "hr": true, "projects": true}'::jsonb, '{"members": 100, "organizations": 25}'::jsonb),
  ('enterprise', 'Enterprise', 'Unlimited workspace features', 0, 'NGN', 'monthly', '{"core": true, "finance": true, "hr": true, "projects": true, "procurement": true}'::jsonb, '{"members": -1, "organizations": -1}'::jsonb)
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
INSERT INTO "sta_tenant_subscriptions" ("tenant_id", "plan_id", "status")
SELECT t."id", p."id", 'active'
FROM "sta_tenants" t
JOIN "sta_subscription_plans" p ON p."code" = COALESCE(t."plan", 'trial')
WHERE NOT EXISTS (
  SELECT 1 FROM "sta_tenant_subscriptions" s
  WHERE s."tenant_id" = t."id" AND s."status" = 'active'
);
