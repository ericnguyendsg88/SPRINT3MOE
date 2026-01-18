-- ============================================================================
-- MIGRATION SCRIPT: Apply Education Level Migrations
-- ============================================================================
-- Run this script in your Supabase SQL Editor to apply the education level
-- migrations that add the column and automatic update triggers.
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to: SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this entire file
-- 5. Click "Run" (or press Ctrl+Enter / Cmd+Enter)
-- ============================================================================

-- Migration 1: Add education_level column to courses
-- From: 20260117000001_add_education_level_to_courses.sql
-- ============================================================================

-- Add education_level column to courses table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'courses' 
    AND column_name = 'education_level'
  ) THEN
    ALTER TABLE public.courses 
    ADD COLUMN education_level text;
  END IF;
END $$;

-- Add check constraint to ensure valid education levels (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'courses_education_level_check'
  ) THEN
    ALTER TABLE public.courses
    ADD CONSTRAINT courses_education_level_check 
    CHECK (education_level IN ('primary', 'secondary', 'post_secondary', 'tertiary', 'postgraduate'));
  END IF;
END $$;

-- Create function to get highest education level from a list
CREATE OR REPLACE FUNCTION get_highest_education_level(levels text[])
RETURNS text AS $$
DECLARE
  level text;
BEGIN
  -- Education level hierarchy (highest to lowest)
  FOREACH level IN ARRAY ARRAY['postgraduate', 'tertiary', 'post_secondary', 'secondary', 'primary']
  LOOP
    IF level = ANY(levels) THEN
      RETURN level;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to update account holder's education level based on enrolled courses
CREATE OR REPLACE FUNCTION update_account_holder_education_level()
RETURNS TRIGGER AS $$
DECLARE
  highest_level text;
BEGIN
  -- Get the highest education level from all active enrollments for this account
  SELECT get_highest_education_level(array_agg(c.education_level))
  INTO highest_level
  FROM enrollments e
  JOIN courses c ON e.course_id = c.id
  WHERE e.account_id = COALESCE(NEW.account_id, OLD.account_id)
    AND e.status = 'active'
    AND c.education_level IS NOT NULL;

  -- Update the account holder's education level
  IF highest_level IS NOT NULL THEN
    UPDATE account_holders
    SET education_level = highest_level
    WHERE id = COALESCE(NEW.account_id, OLD.account_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_education_level_on_enrollment ON enrollments;

CREATE TRIGGER update_education_level_on_enrollment
  AFTER INSERT OR UPDATE OR DELETE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_account_holder_education_level();

-- Add comments for documentation
COMMENT ON COLUMN courses.education_level IS 'Education level associated with this course (primary, secondary, post_secondary, tertiary, postgraduate)';
COMMENT ON FUNCTION get_highest_education_level(text[]) IS 'Returns the highest education level from an array of education levels';
COMMENT ON FUNCTION update_account_holder_education_level() IS 'Automatically updates account holder education level based on their enrolled courses';

-- Migration 2: Update students when course education level changes
-- From: 20260118000000_update_students_on_course_education_level_change.sql
-- ============================================================================

-- Create function to update all enrolled students' education levels when a course's education level changes
CREATE OR REPLACE FUNCTION update_students_on_course_education_level_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if education_level was actually changed
  IF OLD.education_level IS DISTINCT FROM NEW.education_level THEN
    -- For each active enrollment in this course, recalculate the student's education level
    -- This will trigger the existing update_account_holder_education_level function
    -- We do this by touching the enrollment record
    UPDATE enrollments
    SET updated_at = NOW()
    WHERE course_id = NEW.id
      AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS update_students_on_course_education_change ON courses;

CREATE TRIGGER update_students_on_course_education_change
  AFTER UPDATE ON courses
  FOR EACH ROW
  WHEN (OLD.education_level IS DISTINCT FROM NEW.education_level)
  EXECUTE FUNCTION update_students_on_course_education_level_change();

-- Add comment for documentation
COMMENT ON FUNCTION update_students_on_course_education_level_change() IS 'Updates all enrolled students education levels when a course education level is changed';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run these queries to verify the migration was successful:

-- Check if education_level column exists in courses
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'courses' 
  AND column_name = 'education_level';

-- Check if triggers are created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
  'update_education_level_on_enrollment',
  'update_students_on_course_education_change'
);

-- ============================================================================
-- Migration completed successfully!
-- ============================================================================
