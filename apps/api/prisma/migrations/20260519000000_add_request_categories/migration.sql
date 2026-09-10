-- Create request categories table (middle entity between groups/modules and types)
CREATE TABLE "sta_request_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sta_request_categories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sta_request_categories_code_key" UNIQUE ("code")
);

-- Add foreign key from categories to groups
ALTER TABLE "sta_request_categories"
    ADD CONSTRAINT "sta_request_categories_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "sta_request_groups"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add category_id to request types
ALTER TABLE "sta_request_types"
    ADD COLUMN "category_id" UUID;

ALTER TABLE "sta_request_types"
    ADD CONSTRAINT "sta_request_types_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "sta_request_categories"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for category lookups
CREATE INDEX "sta_request_types_category_id_idx" ON "sta_request_types"("category_id");
CREATE INDEX "sta_request_categories_group_id_idx" ON "sta_request_categories"("group_id");
