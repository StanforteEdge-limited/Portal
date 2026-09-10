ALTER TABLE "sta_request_types" ADD COLUMN IF NOT EXISTS "workflow_type" VARCHAR(20);
ALTER TABLE "sta_request_types" ADD COLUMN IF NOT EXISTS "handler_role_label" VARCHAR(100);
