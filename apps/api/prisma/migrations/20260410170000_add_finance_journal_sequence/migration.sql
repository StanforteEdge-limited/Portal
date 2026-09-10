CREATE TABLE "sta_finance_journal_sequences" (
  "id" VARCHAR(32) NOT NULL,
  "prefix" VARCHAR(10) NOT NULL,
  "sequence_year" INTEGER NOT NULL,
  "last_number" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sta_finance_journal_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "unique_finance_journal_sequence_prefix_year"
  ON "sta_finance_journal_sequences"("prefix", "sequence_year");
