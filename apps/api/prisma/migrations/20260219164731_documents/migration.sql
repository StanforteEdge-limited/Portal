-- RenameIndex
ALTER INDEX "unique_ack_subject_version" RENAME TO "sta_acknowledgements_user_id_subject_type_subject_id_versio_key";

-- RenameIndex
ALTER INDEX "unique_document_ack" RENAME TO "sta_document_acknowledgements_document_id_user_id_version_key";
