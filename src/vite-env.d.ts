/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Add other env vars here if needed
  readonly VITE_APP_TITLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
