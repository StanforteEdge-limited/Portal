-- Step 1: Ensure Payment and Leave categories exist
INSERT INTO sta_request_categories (id, group_id, name, code, description, created_at, updated_at)
SELECT gen_random_uuid(), g.id, 'Payment', 'PAYMENT', 'Payment-related requests', NOW(), NOW()
FROM sta_request_groups g
WHERE g.code = 'FIN'
  AND NOT EXISTS (SELECT 1 FROM sta_request_categories WHERE code = 'PAYMENT');

INSERT INTO sta_request_categories (id, group_id, name, code, description, created_at, updated_at)
SELECT gen_random_uuid(), g.id, 'Leave', 'LEAVE', 'Leave-related requests', NOW(), NOW()
FROM sta_request_groups g
WHERE g.code = 'HR'
  AND NOT EXISTS (SELECT 1 FROM sta_request_categories WHERE code = 'LEAVE');

-- Step 2: Assign existing types without a category
UPDATE sta_request_types t
SET category_id = (SELECT c.id FROM sta_request_categories c JOIN sta_request_groups g ON g.id = c.group_id WHERE g.code = 'FIN' AND c.code = 'PAYMENT')
WHERE t.category_id IS NULL AND t.group_id IN (SELECT id FROM sta_request_groups WHERE code = 'FIN');

UPDATE sta_request_types t
SET category_id = (SELECT c.id FROM sta_request_categories c JOIN sta_request_groups g ON g.id = c.group_id WHERE g.code = 'HR' AND c.code = 'LEAVE')
WHERE t.category_id IS NULL AND t.group_id IN (SELECT id FROM sta_request_groups WHERE code = 'HR');

INSERT INTO sta_request_categories (id, group_id, name, code, description, created_at, updated_at)
SELECT gen_random_uuid(), t.group_id, 'Other', 'OTHER_' || g.code, 'Auto-categorized', NOW(), NOW()
FROM sta_request_types t
JOIN sta_request_groups g ON g.id = t.group_id
WHERE t.category_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM sta_request_categories c WHERE c.group_id = t.group_id AND c.code = 'OTHER_' || g.code)
GROUP BY t.group_id, g.code;

UPDATE sta_request_types t
SET category_id = (SELECT c.id FROM sta_request_categories c WHERE c.group_id = t.group_id AND c.code = 'OTHER_' || (SELECT code FROM sta_request_groups WHERE id = t.group_id))
WHERE t.category_id IS NULL;

-- Step 3: Remove group_id, make category_id required, update unique index
ALTER TABLE sta_request_types DROP CONSTRAINT sta_request_types_group_id_fkey;
DROP INDEX sta_request_types_group_id_code_prefix_key;

ALTER TABLE sta_request_types
  DROP COLUMN group_id,
  ALTER COLUMN category_id SET NOT NULL;

CREATE UNIQUE INDEX sta_request_types_category_id_code_prefix_key ON sta_request_types(category_id, code_prefix);
