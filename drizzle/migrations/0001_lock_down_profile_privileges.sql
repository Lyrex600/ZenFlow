REVOKE ALL ON public.profiles FROM anon, authenticated;
REVOKE ALL ON public.login_events FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;
GRANT SELECT ON public.login_events TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.login_events TO service_role;

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.id := OLD.id;
    NEW.email := OLD.email;
    NEW.is_admin := OLD.is_admin;
    NEW.disabled_at := OLD.disabled_at;
    NEW.last_seen_at := OLD.last_seen_at;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.protect_profile_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_protect_columns ON public.profiles;
CREATE TRIGGER profiles_protect_columns BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN uid IS NOT NULL AND uid = auth.uid()
    THEN COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = uid), false)
    ELSE false END
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;