-- Security hardening migration:
-- 1. Protect public.profiles.role against unauthorized elevation.
-- 2. Restrict public.get_team_daily_logs to administrators and set search_path.

-- ── 1. Protect profiles.role from non-admin modification ──
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is changing, only existing admins can perform this change
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Non-admin users cannot alter user roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

-- Also ensure that non-admins cannot insert a profile with role other than 'user'
CREATE OR REPLACE FUNCTION public.protect_profile_role_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM 'user' AND NOT public.is_admin() THEN
    NEW.role := 'user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_profile_role_insert ON public.profiles;
CREATE TRIGGER trg_protect_profile_role_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role_insert();

-- ── 2. Restrict get_team_daily_logs to administrators ──
CREATE OR REPLACE FUNCTION public.get_team_daily_logs(limit_count int default 1000)
RETURNS SETOF public.daily_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can access team daily logs';
  END IF;

  RETURN QUERY
    SELECT * FROM public.daily_logs
    ORDER BY log_date DESC
    LIMIT limit_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_team_daily_logs(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_team_daily_logs(int) TO authenticated;
