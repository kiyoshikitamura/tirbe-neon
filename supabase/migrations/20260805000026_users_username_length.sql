-- Enforce the 8-character username policy for newly inserted or updated rows.
-- NOT VALID keeps existing development data intact until it is audited and remediated.
ALTER TABLE public.users
  ADD CONSTRAINT users_username_length_check
  CHECK (char_length(username) BETWEEN 1 AND 8) NOT VALID;
