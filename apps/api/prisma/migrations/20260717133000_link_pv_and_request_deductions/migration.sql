ALTER TABLE "sta_finance_pv_deductions"
ADD COLUMN "request_deduction_id" UUID;

ALTER TABLE "sta_finance_pv_deductions"
ADD CONSTRAINT "sta_finance_pv_deductions_request_deduction_id_fkey"
FOREIGN KEY ("request_deduction_id") REFERENCES "sta_finance_request_deductions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "sta_finance_pv_deductions_request_deduction_id_key"
ON "sta_finance_pv_deductions"("request_deduction_id");

WITH ranked_pv AS (
  SELECT
    pvd."id" AS pv_deduction_id,
    pv."request_id",
    pvd."deduction_type_id",
    ROW_NUMBER() OVER (
      PARTITION BY pv."request_id", pvd."deduction_type_id"
      ORDER BY pvd."created_at", pvd."id"
    ) AS rn
  FROM "sta_finance_pv_deductions" pvd
  INNER JOIN "sta_finance_payment_vouchers" pv ON pv."id" = pvd."payment_voucher_id"
  WHERE pv."request_id" IS NOT NULL
), ranked_request AS (
  SELECT
    rd."id" AS request_deduction_id,
    rd."request_id",
    rd."deduction_type_id",
    ROW_NUMBER() OVER (
      PARTITION BY rd."request_id", rd."deduction_type_id"
      ORDER BY rd."created_at", rd."id"
    ) AS rn
  FROM "sta_finance_request_deductions" rd
)
UPDATE "sta_finance_pv_deductions" pvd
SET "request_deduction_id" = rr.request_deduction_id
FROM ranked_pv rp
INNER JOIN ranked_request rr
  ON rr."request_id" = rp."request_id"
 AND rr."deduction_type_id" = rp."deduction_type_id"
 AND rr.rn = rp.rn
WHERE pvd."id" = rp.pv_deduction_id;
