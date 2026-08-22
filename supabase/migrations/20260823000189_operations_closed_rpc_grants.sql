-- Phase B6 postflight: closed RPC wrappers are authenticated-only.
begin;
revoke all on function public.search_user_by_name(text),public.send_friend_request(uuid),public.accept_friend_request(uuid),
 public.reject_friend_request(uuid),public.remove_friend(uuid),public.get_friend_helper_loadout(uuid),
 public.buy_normal_shop_product(uuid,text),public.purchase_monthly_pass(uuid),public.claim_daily_pass_reward(uuid)
 from public,anon,authenticated;
grant execute on function public.search_user_by_name(text),public.send_friend_request(uuid),public.accept_friend_request(uuid),
 public.reject_friend_request(uuid),public.remove_friend(uuid),public.get_friend_helper_loadout(uuid),
 public.buy_normal_shop_product(uuid,text),public.purchase_monthly_pass(uuid),public.claim_daily_pass_reward(uuid)
 to authenticated;
commit;
