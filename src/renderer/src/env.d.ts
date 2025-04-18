/// <reference types="vite/client" />

interface Window {
  api: {
    callDeepseek: (messages: Message[]) => Promise<string>,
    getMcpServers: () => Promise<McpServer[]>,
    getRecommendedServers: () => Promise<McpServerDetail[]>,
    fetchGithubReadme: (repoPath: string) => Promise<string>
  }
}
