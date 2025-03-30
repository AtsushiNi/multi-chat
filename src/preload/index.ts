import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { McpServer } from '../main/types/McpHubTypes'

// Custom APIs for renderer
const api = {
  callDeepseek: async (message: string): Promise<string> => {
    return await ipcRenderer.invoke('call-deepseek', message)
  },
  getMcpServers: async (): Promise<McpServer[]> => {
    return await ipcRenderer.invoke('get-mcp-servers')
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
