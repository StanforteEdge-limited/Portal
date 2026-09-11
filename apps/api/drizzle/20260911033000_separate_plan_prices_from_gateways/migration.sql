CREATE TABLE IF NOT EXISTS "sta_subscription_plan_prices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" uuid NOT NULL,
  "provider" varchar(30) NOT NULL,
  "amount_minor" integer DEFAULT 0 NOT NULL,
  "currency" varchar(3) DEFAULT 'NGN' NOT NULL,
  "interval" varchar(20) DEFAULT 'monthly' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp(6) DEFAULT now() NOT NULL,
  "updated_at" timestamp(6) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plan_price_unique"
  ON "sta_subscription_plan_prices" ("plan_id", "provider", "currency", "interval");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_plan_price_plan_idx"
  ON "sta_subscription_plan_prices" ("plan_id");
--> statement-breakpoint
ALTER TABLE "sta_subscription_plan_prices"
  ADD CONSTRAINT "subscription_plan_price_plan_fk"
  FOREIGN KEY ("plan_id") REFERENCES "sta_subscription_plans" ("id") ON DELETE CASCADE;
--> statement-breakpoint
INSERT INTO "sta_subscription_plan_prices" ("plan_id", "provider", "amount_minor", "currency", "interval")
SELECT "id", 'paystack', "amount_minor", "currency", "interval"
FROM "sta_subscription_plans"
WHERE NOT EXISTS (
  SELECT 1
  FROM "sta_subscription_plan_prices" p
  WHERE p."plan_id" = "sta_subscription_plans"."id"
    AND p."provider" = 'paystack'
    AND p."currency" = "sta_subscription_plans"."currency"
    AND p."interval" = "sta_subscription_plans"."interval"
);
