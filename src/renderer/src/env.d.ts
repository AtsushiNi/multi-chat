/// <reference types="vite/client" />

interface Window {
  api: {
    callDeepseek: (message: string) => Promise<string>;
  };
}
