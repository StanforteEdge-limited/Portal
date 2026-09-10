-- AddColumn
ALTER TABLE "sta_request_items" ADD COLUMN "file_id" UUID;

-- CreateIndex
CREATE INDEX "sta_request_items_file_id_idx" ON "sta_request_items"("file_id");

-- AddForeignKey
ALTER TABLE "sta_request_items" ADD CONSTRAINT "sta_request_items_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "sta_file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropTable
DROP TABLE IF EXISTS "sta_request_item_files";
