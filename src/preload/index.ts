import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { McpServer, McpServerDetail } from '../main/types/McpHubTypes'
import { Message } from '../main/types/MessageTypes'

// Custom APIs for renderer
const api = {
  callDeepseek: async (messages: Message[]): Promise<string> => {
    return await ipcRenderer.invoke('call-deepseek', messages)
  },
  getMcpServers: async (): Promise<McpServer[]> => {
    return await ipcRenderer.invoke('get-mcp-servers')
  },
  getRecommendedServers: async (): Promise<McpServerDetail[]> => {
    return await ipcRenderer.invoke('get-recommended-servers')
  },
  fetchGithubReadme: async (repoPath: string): Promise<string> => {
    return await ipcRenderer.invoke('fetch-github-readme', repoPath)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
