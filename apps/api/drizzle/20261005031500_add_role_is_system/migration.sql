ALTER TABLE "sta_roles" ADD COLUMN IF NOT EXISTS "is_system" boolean DEFAULT false NOT NULL;
