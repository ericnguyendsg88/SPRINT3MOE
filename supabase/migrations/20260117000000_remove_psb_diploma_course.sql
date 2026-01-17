-- Remove "Diploma in Business Administration (Digital Marketing)" course by PSB Academy
-- This keeps the provider information but removes the course
DELETE FROM courses 
WHERE name = 'Diploma in Business Administration (Digital Marketing)' 
AND provider = 'PSB Academy';
