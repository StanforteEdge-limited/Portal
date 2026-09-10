-- CreateTable
CREATE TABLE "sta_documents" (
  "id" UUID NOT NULL,
  "organization_id" BIGINT,
  "title" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(180) NOT NULL,
  "category" VARCHAR(50) NOT NULL DEFAULT 'policy',
  "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
  "version" VARCHAR(40) NOT NULL DEFAULT '1.0',
  "effective_date" DATE,
  "content_html" TEXT,
  "file_id" UUID,
  "require_acknowledgement" BOOLEAN NOT NULL DEFAULT false,
  "created_by" BIGINT,
  "updated_by" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sta_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_document_acknowledgements" (
  "id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "user_id" BIGINT NOT NULL,
  "version" VARCHAR(40) NOT NULL,
  "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address" VARCHAR(64),
  "user_agent" VARCHAR(512),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sta_document_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sta_documents_slug_key" ON "sta_documents"("slug");
CREATE INDEX "sta_documents_organization_id_idx" ON "sta_documents"("organization_id");
CREATE INDEX "sta_documents_status_idx" ON "sta_documents"("status");
CREATE INDEX "sta_documents_category_idx" ON "sta_documents"("category");

CREATE UNIQUE INDEX "unique_document_ack" ON "sta_document_acknowledgements"("document_id", "user_id", "version");
CREATE INDEX "sta_document_acknowledgements_user_id_idx" ON "sta_document_acknowledgements"("user_id");

-- AddForeignKey
ALTER TABLE "sta_documents" ADD CONSTRAINT "sta_documents_organization_id_fkey"
FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_documents" ADD CONSTRAINT "sta_documents_file_id_fkey"
FOREIGN KEY ("file_id") REFERENCES "sta_file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sta_document_acknowledgements" ADD CONSTRAINT "sta_document_acknowledgements_document_id_fkey"
FOREIGN KEY ("document_id") REFERENCES "sta_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sta_document_acknowledgements" ADD CONSTRAINT "sta_document_acknowledgements_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
