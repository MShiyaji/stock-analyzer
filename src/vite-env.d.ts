/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_KEY: string;
    readonly VITE_TAVILY_API_KEY: string;
    readonly VITE_REDDIT_CLIENT_ID: string;
    readonly VITE_REDDIT_CLIENT_SECRET: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
