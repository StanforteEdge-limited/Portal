CREATE TABLE "sta_policies" (
  "id" UUID NOT NULL,
  "module" VARCHAR(60) NOT NULL,
  "policy_key" VARCHAR(120) NOT NULL,
  "scope_type" VARCHAR(40) NOT NULL DEFAULT 'global',
  "scope_id" VARCHAR(191),
  "priority" INTEGER NOT NULL DEFAULT 100,
  "config_json" JSONB NOT NULL,
  "effective_from" TIMESTAMP(3),
  "effective_to" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "document_id" UUID,
  "document_version" VARCHAR(40),
  "require_acknowledgement" BOOLEAN NOT NULL DEFAULT false,
  "created_by" BIGINT,
  "updated_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "sta_policies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sta_policies_module_policy_key_is_active_idx" ON "sta_policies"("module", "policy_key", "is_active");
CREATE INDEX "sta_policies_scope_type_scope_id_idx" ON "sta_policies"("scope_type", "scope_id");
CREATE INDEX "sta_policies_effective_from_effective_to_idx" ON "sta_policies"("effective_from", "effective_to");

ALTER TABLE "sta_policies"
  ADD CONSTRAINT "sta_policies_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "sta_documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
