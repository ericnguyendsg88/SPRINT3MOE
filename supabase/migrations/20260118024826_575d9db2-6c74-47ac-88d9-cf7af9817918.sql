-- Rename 'spr' to 'pr' in residential_status enum
-- Step 1: Drop the default constraint first
ALTER TABLE account_holders ALTER COLUMN residential_status DROP DEFAULT;

-- Step 2: Create new enum type with 'pr' instead of 'spr'
CREATE TYPE residential_status_new AS ENUM ('sc', 'pr', 'non_resident');

-- Step 3: Update the column to use the new enum type
ALTER TABLE account_holders 
  ALTER COLUMN residential_status TYPE residential_status_new 
  USING (
    CASE residential_status::text 
      WHEN 'spr' THEN 'pr'::residential_status_new
      ELSE residential_status::text::residential_status_new
    END
  );

-- Step 4: Drop the old enum and rename the new one
DROP TYPE residential_status;
ALTER TYPE residential_status_new RENAME TO residential_status;

-- Step 5: Re-add the default (now using 'sc' as the default)
ALTER TABLE account_holders ALTER COLUMN residential_status SET DEFAULT 'sc'::residential_status;