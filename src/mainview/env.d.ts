/// <reference types="vite/client" />

import type { api } from './rpc'

declare global {
  interface Window {
    api: typeof api
  }
}
