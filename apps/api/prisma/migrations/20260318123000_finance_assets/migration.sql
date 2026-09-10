-- CreateTable
CREATE TABLE "sta_finance_assets" (
    "id" UUID NOT NULL,
    "asset_id" VARCHAR(50) NOT NULL,
    "organization_id" BIGINT,
    "team_id" BIGINT,
    "asset_description" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "serial_tag_no" VARCHAR(120),
    "location_project" VARCHAR(150),
    "assigned_to_user_id" BIGINT,
    "purchase_date" DATE NOT NULL,
    "supplier" VARCHAR(150),
    "purchase_cost" DECIMAL(15,2) NOT NULL,
    "useful_life_years" INTEGER NOT NULL,
    "salvage_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "condition" VARCHAR(40) NOT NULL DEFAULT 'good',
    "status" VARCHAR(40) NOT NULL DEFAULT 'active',
    "last_verified_date" DATE,
    "last_verified_by" BIGINT,
    "notes" TEXT,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_asset_verifications" (
    "id" UUID NOT NULL,
    "asset_record_id" UUID NOT NULL,
    "verified_at" DATE NOT NULL,
    "condition" VARCHAR(40) NOT NULL,
    "location_project" VARCHAR(150),
    "assigned_to_user_id" BIGINT,
    "verified_by" BIGINT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_asset_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_finance_asset_disposals" (
    "id" UUID NOT NULL,
    "asset_record_id" UUID NOT NULL,
    "disposal_date" DATE NOT NULL,
    "disposal_method" VARCHAR(100) NOT NULL,
    "proceeds" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "book_value_at_disposal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "gain_loss" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "approved_by" BIGINT,
    "donor_asset" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_finance_asset_disposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_assets_asset_id_key" ON "sta_finance_assets"("asset_id");

-- CreateIndex
CREATE INDEX "sta_finance_assets_organization_id_idx" ON "sta_finance_assets"("organization_id");

-- CreateIndex
CREATE INDEX "sta_finance_assets_team_id_idx" ON "sta_finance_assets"("team_id");

-- CreateIndex
CREATE INDEX "sta_finance_assets_assigned_to_user_id_idx" ON "sta_finance_assets"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "sta_finance_assets_category_idx" ON "sta_finance_assets"("category");

-- CreateIndex
CREATE INDEX "sta_finance_assets_status_idx" ON "sta_finance_assets"("status");

-- CreateIndex
CREATE INDEX "sta_finance_assets_purchase_date_idx" ON "sta_finance_assets"("purchase_date");

-- CreateIndex
CREATE INDEX "sta_finance_asset_verifications_asset_record_id_idx" ON "sta_finance_asset_verifications"("asset_record_id");

-- CreateIndex
CREATE INDEX "sta_finance_asset_verifications_verified_at_idx" ON "sta_finance_asset_verifications"("verified_at");

-- CreateIndex
CREATE UNIQUE INDEX "sta_finance_asset_disposals_asset_record_id_key" ON "sta_finance_asset_disposals"("asset_record_id");

-- CreateIndex
CREATE INDEX "sta_finance_asset_disposals_disposal_date_idx" ON "sta_finance_asset_disposals"("disposal_date");

-- AddForeignKey
ALTER TABLE "sta_finance_assets" ADD CONSTRAINT "sta_finance_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_assets" ADD CONSTRAINT "sta_finance_assets_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "sta_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_assets" ADD CONSTRAINT "sta_finance_assets_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_assets" ADD CONSTRAINT "sta_finance_assets_last_verified_by_fkey" FOREIGN KEY ("last_verified_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_assets" ADD CONSTRAINT "sta_finance_assets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_assets" ADD CONSTRAINT "sta_finance_assets_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_asset_verifications" ADD CONSTRAINT "sta_finance_asset_verifications_asset_record_id_fkey" FOREIGN KEY ("asset_record_id") REFERENCES "sta_finance_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_asset_verifications" ADD CONSTRAINT "sta_finance_asset_verifications_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_asset_verifications" ADD CONSTRAINT "sta_finance_asset_verifications_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "sta_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_asset_disposals" ADD CONSTRAINT "sta_finance_asset_disposals_asset_record_id_fkey" FOREIGN KEY ("asset_record_id") REFERENCES "sta_finance_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_asset_disposals" ADD CONSTRAINT "sta_finance_asset_disposals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_finance_asset_disposals" ADD CONSTRAINT "sta_finance_asset_disposals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
