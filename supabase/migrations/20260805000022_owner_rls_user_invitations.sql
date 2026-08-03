-- Development migration: invitations are visible only to either participant.
drop policy if exists "Allow all access to user_invitations" on public.user_invitations;
drop policy if exists "participants access to user_invitations" on public.user_invitations;

create policy "participants access to user_invitations"
on public.user_invitations
for all
using (auth.uid() = inviter_user_id or auth.uid() = invitee_user_id)
with check (auth.uid() = inviter_user_id or auth.uid() = invitee_user_id);
