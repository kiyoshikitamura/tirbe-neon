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
