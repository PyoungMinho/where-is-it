import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// 빌드 타임에는 에러를 던지지 않고, 런타임에만 경고
if (typeof window !== "undefined" && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn("⚠️ Supabase 환경변수가 설정되지 않았습니다. Vercel 환경변수 설정을 확인하세요.");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);
