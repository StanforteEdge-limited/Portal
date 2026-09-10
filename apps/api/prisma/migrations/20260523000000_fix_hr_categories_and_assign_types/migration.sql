-- Fix: LEAVE category was never created because migration 20260520000001
-- used WHERE g.code = 'HR' but the live HR group has code 'hr' (lowercase).
-- All HR types fell into the OTHER_hr catch-all as a result.
-- LOAN category was never created (only in seed-loans-system, not baseline).

-- 1. Create LEAVE category under HR group (match by name, not code)
INSERT INTO sta_request_categories (id, group_id, name, code, description, sort_order, is_active, created_at, updated_at)
SELECT gen_random_uuid(), g.id, 'Leave', 'LEAVE', 'Leave-related requests', 20, true, NOW(), NOW()
FROM sta_request_groups g
WHERE LOWER(g.name) = 'human resources'
  AND NOT EXISTS (SELECT 1 FROM sta_request_categories WHERE code = 'LEAVE');

-- 2. Create LOAN category under HR group
INSERT INTO sta_request_categories (id, group_id, name, code, description, sort_order, is_active, created_at, updated_at)
SELECT gen_random_uuid(), g.id, 'Loans', 'LOAN', 'Staff Loans & Salary Advances', 30, true, NOW(), NOW()
FROM sta_request_groups g
WHERE LOWER(g.name) = 'human resources'
  AND NOT EXISTS (SELECT 1 FROM sta_request_categories WHERE code = 'LOAN');

-- 3. Ensure correct sort orders on existing categories
UPDATE sta_request_categories SET sort_order = 10 WHERE code = 'PAYMENT';
UPDATE sta_request_categories SET sort_order = 20 WHERE code = 'LEAVE';
UPDATE sta_request_categories SET sort_order = 30 WHERE code = 'LOAN';

-- 4. Reassign Leave Request (LR) types to LEAVE
UPDATE sta_request_types
SET category_id = (SELECT id FROM sta_request_categories WHERE code = 'LEAVE')
WHERE code_prefix = 'LR'
  AND (SELECT id FROM sta_request_categories WHERE code = 'LEAVE') IS NOT NULL;

-- 5. Reassign Loan (LN) and Salary Advance (SA) types to LOAN
UPDATE sta_request_types
SET category_id = (SELECT id FROM sta_request_categories WHERE code = 'LOAN')
WHERE code_prefix IN ('LN', 'SA')
  AND (SELECT id FROM sta_request_categories WHERE code = 'LOAN') IS NOT NULL;

-- 6. Deactivate OTHER_hr — it should now be empty
UPDATE sta_request_categories SET is_active = false WHERE LOWER(code) LIKE 'other\_%' ESCAPE '\';
