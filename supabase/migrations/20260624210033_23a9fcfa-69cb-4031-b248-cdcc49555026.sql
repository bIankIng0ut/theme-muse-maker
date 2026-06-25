
CREATE OR REPLACE FUNCTION public.owns_investigation(_inv UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.investigations WHERE id = _inv AND owner_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.owns_investigation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_investigation(UUID) TO authenticated;
