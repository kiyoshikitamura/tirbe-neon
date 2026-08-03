DROP POLICY IF EXISTS "Allow all access to user_characters" ON public.user_characters;
DROP POLICY IF EXISTS "Allow all access to user_skills" ON public.user_skills;
DROP POLICY IF EXISTS "Allow all access to user_equipments" ON public.user_equipments;
DROP POLICY IF EXISTS "Allow all access to user_items" ON public.user_items;

CREATE POLICY "Users can manage their own characters" ON public.user_characters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own skills" ON public.user_skills
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own equipments" ON public.user_equipments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own items" ON public.user_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
