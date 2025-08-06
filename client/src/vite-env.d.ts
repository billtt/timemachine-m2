/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NODE_ENV?: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __BUILD_INFO__: {
  gitSha: string;
  buildTime: string;
};