-- AlterTable
ALTER TABLE "sta_profiles" ADD COLUMN     "signature_file_id" UUID;

-- AddForeignKey
ALTER TABLE "sta_profiles" ADD CONSTRAINT "sta_profiles_signature_file_id_fkey" FOREIGN KEY ("signature_file_id") REFERENCES "sta_file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
