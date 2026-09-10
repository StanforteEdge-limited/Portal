-- CreateTable
CREATE TABLE "sta_file_assets" (
    "id" UUID NOT NULL,
    "organization_id" BIGINT,
    "uploaded_by" BIGINT,
    "storage_disk" VARCHAR(30) NOT NULL DEFAULT 'local',
    "storage_path" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120),
    "file_size" BIGINT,
    "public_url" VARCHAR(500),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_request_item_files" (
    "id" UUID NOT NULL,
    "request_item_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sta_request_item_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sta_file_assets_organization_id_idx" ON "sta_file_assets"("organization_id");

-- CreateIndex
CREATE INDEX "sta_file_assets_uploaded_by_idx" ON "sta_file_assets"("uploaded_by");

-- CreateIndex
CREATE UNIQUE INDEX "unique_request_item_file" ON "sta_request_item_files"("request_item_id", "file_id");

-- CreateIndex
CREATE INDEX "sta_request_item_files_file_id_idx" ON "sta_request_item_files"("file_id");

-- AddForeignKey
ALTER TABLE "sta_file_assets" ADD CONSTRAINT "sta_file_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_file_assets" ADD CONSTRAINT "sta_file_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "sta_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_request_item_files" ADD CONSTRAINT "sta_request_item_files_request_item_id_fkey" FOREIGN KEY ("request_item_id") REFERENCES "sta_request_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_request_item_files" ADD CONSTRAINT "sta_request_item_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "sta_file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
