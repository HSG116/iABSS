/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly EXPO_PUBLIC_SUPABASE_URL: string
    readonly EXPO_PUBLIC_SUPABASE_KEY: string
    readonly PEXELS_API_KEY: string
    readonly LOGO_DEV_TOKEN: string
    readonly OBS_STUDIO_TOKEN: string
    readonly ADMIN_FALLBACK_PASSWORD: string
    readonly GEMINI_API_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
