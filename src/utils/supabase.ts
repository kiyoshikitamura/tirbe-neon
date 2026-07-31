import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { MockSupabaseClient } from "./mock/MockSupabaseClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ktpolnkyyfkowxdmijww.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// 環境変数によるモック判定（NEXT_PUBLIC_USE_MOCK_DB=true の場合、またはキー未設定時にモック起動）
const forceMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === "true";
const isDummy = forceMock || !supabaseAnonKey || supabaseAnonKey.includes("dummy_key");

export const supabase = (isDummy
  ? (new MockSupabaseClient() as any)
  : createClient(supabaseUrl, supabaseAnonKey)) as SupabaseClient<any, "public", any>;
