-- Profiles: one row per auth user. Passwords never live here (Auth stores only bcrypt hashes).
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  is_admin boolean NOT NULL DEFAULT false,
  disabled_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Users may read their row and change only their display name; is_admin, disabled_at, last_seen_at are server-controlled.
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER role check: avoids recursive RLS on profiles.
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = uid), false)
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Validate display names on every write.
CREATE OR REPLACE FUNCTION public.validate_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS NOT NULL THEN
    NEW.display_name := NULLIF(btrim(regexp_replace(NEW.display_name, '[<>[:cntrl:]]', '', 'g')), '');
    IF NEW.display_name IS NOT NULL AND char_length(NEW.display_name) > 40 THEN
      NEW.display_name := left(NEW.display_name, 40);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_validate BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile();

-- Auto-create a profile on signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, COALESCE(NEW.email, ''), NEW.raw_user_meta_data ->> 'display_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Online status heartbeat: a user can only touch their own last_seen_at.
CREATE OR REPLACE FUNCTION public.touch_presence()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.touch_presence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_presence() TO authenticated;

-- Login events: written only by the server (service role) after a verified sign-in.
CREATE TABLE public.login_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_events_user_created_idx ON public.login_events (user_id, created_at DESC);

GRANT SELECT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own login events" ON public.login_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all login events" ON public.login_events
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Admin overview: runs with the caller's rights, so RLS + the is_admin check both apply.
CREATE OR REPLACE FUNCTION public.admin_user_overview()
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  is_admin boolean,
  disabled_at timestamptz,
  last_seen_at timestamptz,
  last_login_at timestamptz,
  last_ip text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.display_name, p.created_at, p.is_admin, p.disabled_at, p.last_seen_at,
         l.created_at AS last_login_at, host(l.ip) AS last_ip
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT e.created_at, e.ip FROM public.login_events e
    WHERE e.user_id = p.id ORDER BY e.created_at DESC LIMIT 1
  ) l ON true
  WHERE public.is_admin(auth.uid())
  ORDER BY p.created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.admin_user_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_overview() TO authenticated;