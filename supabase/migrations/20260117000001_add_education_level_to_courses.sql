-- Add education_level column to courses table
ALTER TABLE public.courses 
ADD COLUMN education_level text;

-- Add check constraint to ensure valid education levels
ALTER TABLE public.courses
ADD CONSTRAINT courses_education_level_check 
CHECK (education_level IN ('primary', 'secondary', 'post_secondary', 'tertiary', 'postgraduate'));

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

-- Create trigger to automatically update education level on enrollment changes
CREATE TRIGGER update_education_level_on_enrollment
  AFTER INSERT OR UPDATE OR DELETE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_account_holder_education_level();

-- Add comment for documentation
COMMENT ON COLUMN courses.education_level IS 'Education level associated with this course (primary, secondary, post_secondary, tertiary, postgraduate)';
COMMENT ON FUNCTION get_highest_education_level(text[]) IS 'Returns the highest education level from an array of education levels';
COMMENT ON FUNCTION update_account_holder_education_level() IS 'Automatically updates account holder education level based on their enrolled courses';
