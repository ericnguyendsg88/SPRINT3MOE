-- Add descriptions to existing top-up schedules in the remarks field
-- This migration updates existing batch top-up schedules to include dummy descriptions

-- Update batch schedules with reasonable descriptions based on their rule names and criteria
UPDATE top_up_schedules
SET remarks = jsonb_set(
  COALESCE(remarks::jsonb, '{}'::jsonb),
  '{description}',
  to_jsonb(
    CASE 
      WHEN rule_name ILIKE '%low income%' THEN 'Financial assistance for low-income families to support education expenses'
      WHEN rule_name ILIKE '%scholarship%' THEN 'Merit-based scholarship award for academic excellence'
      WHEN rule_name ILIKE '%bursary%' THEN 'Needs-based bursary to help with course fees and materials'
      WHEN rule_name ILIKE '%quarterly%' THEN 'Quarterly education allowance for ongoing learning support'
      WHEN rule_name ILIKE '%annual%' THEN 'Annual education grant for skills development and training'
      WHEN rule_name ILIKE '%senior%' THEN 'Senior citizen education subsidy for lifelong learning'
      WHEN rule_name ILIKE '%youth%' THEN 'Youth development program grant for skill building'
      WHEN rule_name ILIKE '%primary%' THEN 'Primary education support for foundational learning'
      WHEN rule_name ILIKE '%secondary%' THEN 'Secondary education assistance for continued studies'
      WHEN rule_name ILIKE '%tertiary%' OR rule_name ILIKE '%university%' THEN 'Higher education grant for university and tertiary studies'
      WHEN rule_name ILIKE '%special%' THEN 'Special education needs support program'
      WHEN rule_name ILIKE '%emergency%' THEN 'Emergency education assistance for urgent needs'
      WHEN rule_name ILIKE '%covid%' OR rule_name ILIKE '%pandemic%' THEN 'COVID-19 education relief fund'
      ELSE 'Government education subsidy to support learning and skills development'
    END
  )
)::text
WHERE remarks IS NOT NULL AND remarks::jsonb ? 'targetingType';

-- For schedules without structured remarks, create new JSON with description
UPDATE top_up_schedules
SET remarks = json_build_object(
  'description', 'Government education subsidy to support learning and skills development',
  'note', 'Legacy top-up schedule'
)::text
WHERE remarks IS NULL OR NOT (remarks::jsonb ? 'targetingType');

-- Update individual top-up transactions to include reference ID in description if not already present
UPDATE transactions
SET description = CASE
  WHEN description ILIKE 'individual top-up%' AND reference IS NOT NULL AND description NOT ILIKE '%' || reference || '%' 
    THEN description || ' (Ref: ' || reference || ')'
  WHEN type = 'top_up' AND reference IS NOT NULL AND description NOT ILIKE '%ref:%'
    THEN COALESCE(description, 'Top-up') || ' (Ref: ' || reference || ')'
  ELSE description
END
WHERE type = 'top_up' AND reference IS NOT NULL;
