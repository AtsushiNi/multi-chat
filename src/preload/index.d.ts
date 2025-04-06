import { ElectronAPI } from '@electron-toolkit/preload'
import { McpServer, McpServerDetail } from '../main/types/McpHubTypes'
import { Message } from '../main/types/MessageTypes'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      callDeepseek: (messages: Message[]) => Promise<string>
      getMcpServers: () => Promise<McpServer[]>
      getRecommendedServers: () => Promise<McpServerDetail[]>
      fetchGithubReadme: (repoPath: string) => Promise<string>
    }
  }
}
