-- Migration: remove triggers and functions that enforced team-size validation
-- This will drop the BEFORE/AFTER triggers and the helper functions

BEGIN;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS trg_teammembers_prevent_overflow ON TeamMembers;
DROP TRIGGER IF EXISTS trg_teammembers_adjust_count ON TeamMembers;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS fn_teammembers_prevent_overflow() CASCADE;
DROP FUNCTION IF EXISTS fn_teammembers_adjust_count() CASCADE;

COMMIT;
