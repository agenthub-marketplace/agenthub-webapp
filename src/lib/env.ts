type PublicEnv = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  appUrl?: string;
};

const readOptional = (value: string | undefined) => {
  return value && value.trim().length > 0 ? value : undefined;
};

export const publicEnv: PublicEnv = {
  supabaseUrl: readOptional(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: readOptional(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  appUrl: readOptional(process.env.NEXT_PUBLIC_APP_URL),
};

export function hasSupabasePublicConfig() {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}
