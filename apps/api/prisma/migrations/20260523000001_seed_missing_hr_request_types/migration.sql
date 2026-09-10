-- Ensure Leave Request type exists under LEAVE category
INSERT INTO sta_request_types (
  id, category_id, name, code_prefix, description,
  storage_type, approval_flow_json, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM sta_request_categories WHERE code = 'LEAVE'),
  'Leave Request',
  'LR',
  'Standard leave request workflow',
  'json',
  '{"steps":[{"approver":{"type":"relation","value":"requester_team_lead_or_manager"}},{"approver":{"type":"permission","value":"hr.approve"}}]}'::jsonb,
  true,
  NOW(),
  NOW()
WHERE
  (SELECT id FROM sta_request_categories WHERE code = 'LEAVE') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sta_request_types
    WHERE category_id = (SELECT id FROM sta_request_categories WHERE code = 'LEAVE')
      AND code_prefix = 'LR'
  );

-- Ensure Loan Request type exists under LOAN category
INSERT INTO sta_request_types (
  id, category_id, name, code_prefix, description,
  storage_type, approval_flow_json, visible_to_roles, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM sta_request_categories WHERE code = 'LOAN'),
  'Loan Request',
  'LN',
  'Staff Loan Request',
  'json',
  '{"steps":[{"role":"team_lead"},{"role":"hr"},{"role":"accountant"}]}'::jsonb,
  '["staff"]'::jsonb,
  true,
  NOW(),
  NOW()
WHERE
  (SELECT id FROM sta_request_categories WHERE code = 'LOAN') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sta_request_types
    WHERE category_id = (SELECT id FROM sta_request_categories WHERE code = 'LOAN')
      AND code_prefix = 'LN'
  );

-- Ensure Salary Advance type exists under LOAN category
INSERT INTO sta_request_types (
  id, category_id, name, code_prefix, description,
  storage_type, approval_flow_json, visible_to_roles, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM sta_request_categories WHERE code = 'LOAN'),
  'Salary Advance',
  'SA',
  'Staff Salary Advance Request',
  'json',
  '{"steps":[{"role":"team_lead"},{"role":"hr"},{"role":"accountant"}]}'::jsonb,
  '["staff"]'::jsonb,
  true,
  NOW(),
  NOW()
WHERE
  (SELECT id FROM sta_request_categories WHERE code = 'LOAN') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM sta_request_types
    WHERE category_id = (SELECT id FROM sta_request_categories WHERE code = 'LOAN')
      AND code_prefix = 'SA'
  );

-- Reassign any LR/LN/SA types still stuck in OTHER_hr or wrong category
UPDATE sta_request_types
SET category_id = (SELECT id FROM sta_request_categories WHERE code = 'LEAVE')
WHERE code_prefix = 'LR'
  AND category_id != (SELECT id FROM sta_request_categories WHERE code = 'LEAVE')
  AND (SELECT id FROM sta_request_categories WHERE code = 'LEAVE') IS NOT NULL;

UPDATE sta_request_types
SET category_id = (SELECT id FROM sta_request_categories WHERE code = 'LOAN')
WHERE code_prefix IN ('LN', 'SA')
  AND category_id != (SELECT id FROM sta_request_categories WHERE code = 'LOAN')
  AND (SELECT id FROM sta_request_categories WHERE code = 'LOAN') IS NOT NULL;
