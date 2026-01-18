-- Add billing_date and billing_due_date columns to courses table
ALTER TABLE public.courses 
ADD COLUMN billing_date date NULL,
ADD COLUMN billing_due_date date NULL;