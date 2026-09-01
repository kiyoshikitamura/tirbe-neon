import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { MockSupabaseClient } from "./mock/MockSupabaseClient";

const appEnvironment = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase() || "development";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
const forceMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === "true";
const isProduction = appEnvironment === "production";

if (isProduction && forceMock) {
  throw new Error("NEXT_PUBLIC_USE_MOCK_DB must not be enabled in Production.");
}

if (!forceMock && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    `Supabase configuration is missing for ${appEnvironment}. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or explicitly enable NEXT_PUBLIC_USE_MOCK_DB outside Production.`,
  );
}

if (!forceMock && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) {
  throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a valid Supabase project URL for ${appEnvironment}.`);
}

if (isProduction && supabaseAnonKey.includes("dummy")) {
  throw new Error("A dummy Supabase anon key must not be used in Production.");
}

export const usingMockSupabase = forceMock;

export const supabase = (forceMock
  ? (new MockSupabaseClient() as any)
  : createClient(supabaseUrl, supabaseAnonKey)) as SupabaseClient<any, "public", any>;

export async function discardAnonymousAccountForSwitch(anonymousSession: { access_token: string; refresh_token: string; user: { id: string } }) {
  if (forceMock) {
    const currentUserId = window.localStorage.getItem("tribe_demo_uuid");
    const currentAuthMode = window.localStorage.getItem("mock_auth_mode");
    try {
      window.localStorage.setItem("tribe_demo_uuid", anonymousSession.user.id);
      window.localStorage.setItem("mock_auth_mode", "ANONYMOUS");
      return await supabase.rpc("discard_current_anonymous_account_for_switch");
    } finally {
      if (currentUserId) window.localStorage.setItem("tribe_demo_uuid", currentUserId);
      else window.localStorage.removeItem("tribe_demo_uuid");
      if (currentAuthMode) window.localStorage.setItem("mock_auth_mode", currentAuthMode);
      else window.localStorage.removeItem("mock_auth_mode");
    }
  }

  const isolated = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: sessionError } = await isolated.auth.setSession({
    access_token: anonymousSession.access_token,
    refresh_token: anonymousSession.refresh_token,
  });
  if (sessionError) return { data: null, error: sessionError };
  return isolated.rpc("discard_current_anonymous_account_for_switch");
}

export async function authenticateExistingEmailAccount(email: string, password: string) {
  if (forceMock) {
    const identities = JSON.parse(window.localStorage.getItem("mock_db_auth_identities") || "[]");
    const identity = identities.find((row: any) => row.provider === "email" && row.email?.toLowerCase() === email.toLowerCase());
    if (!identity || window.localStorage.getItem("mock_existing_email_password") !== password) {
      return { session: null, error: new Error("メールアドレスまたはパスワードが正しくありません。") };
    }
    return {
      session: { access_token: `mock:${identity.user_id}`, refresh_token: `mock:${identity.user_id}`, user: { id: identity.user_id } },
      error: null,
    };
  }

  const isolated = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await isolated.auth.signInWithPassword({ email, password });
  if (error || !data.session) return { session: null, error: error || new Error("既存アカウントを確認できませんでした。") };
  const { data: state, error: stateError } = await isolated.rpc("get_current_onboarding_state");
  if (stateError || !state?.has_profile) {
    return { session: null, error: stateError || new Error("既存のゲームデータを確認できませんでした。") };
  }
  return { session: data.session, error: null };
}
