/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vite/client" />

interface Window {
  api: {
    callDeepseek: (message: string) => Promise<string>,
    getMcpServers: () => Promise<any>
  }
}
