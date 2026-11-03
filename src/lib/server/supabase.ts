import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const PHOTO_BUCKET = 'applicant-photos';
export const hasDb = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

let client: SupabaseClient | null = null;
/** 서버 전용 service-role 클라이언트. 브라우저로 절대 보내지 않는다. */
export function db() {
  if (!hasDb()) throw new Error('Supabase 키가 없어요 (.env.local 확인)');
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  return client;
}
