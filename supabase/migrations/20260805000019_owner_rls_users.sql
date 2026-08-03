DROP POLICY IF EXISTS "Allow all access to users" ON public.users;

CREATE POLICY "Users can manage their own profile" ON public.users
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
