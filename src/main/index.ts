import 'dotenv/config'
import { app, shell, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron'
import { Message } from './types/MessageTypes'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import axios from 'axios'
import xml2js from 'xml2js'
import { McpHub } from './McpHub'
import { SYSTEM_PROMPT } from './systemPrompt'

let mcpHub: McpHub
let systemPrompt: string

interface DeepSeekResponse {
  thinking: string[]
  mcp_server?: Array<{
    use_mcp_tool: Array<{
      server_name: string[]
      tool_name: string[]
      arguments: string
    }>
  }>
}

async function recursivelyCallRequest(messages: Message[]): Promise<string> {
  const response = await callDeepSeek(messages)
  if (!response.mcp_server || !response.mcp_server[0]) {
    return response.thinking[0]
  }

  const tool = response.mcp_server[0].use_mcp_tool[0]
  const toolResponse = await mcpHub.callTool(
    tool.server_name[0],
    tool.tool_name[0],
    JSON.parse(tool.arguments)
  )
  console.log("toolResponse")
  console.log(toolResponse)
  let resultText = 'ツールの実行結果を表示できません'
  if (toolResponse.content[0].type === 'text') {
    resultText = toolResponse.content[0].text
  } else if (toolResponse.content[0].type === 'resource' && toolResponse.content[0].resource.text) {
    resultText = toolResponse.content[0].resource.text
  }
  const nextMessages: Message[] = [
    ...messages,
    {
      role: 'assistant',
      content: response.thinking[0]
    },
    {
      role: 'user',
      content: `ツールを実行した結果は以下です\n${resultText}`
    }
  ]
  return await recursivelyCallRequest(nextMessages)
}

async function callDeepSeek(messages: Message[]): Promise<DeepSeekResponse> {
  try {
    console.log('start request')
    console.log(messages)

    const formattedMessages = messages.map((message) => ({
      role: message.role,
      content: message.content
    }))
    const response = await axios.post<{
      choices: Array<{
        message: {
          content: string
        }
      }>
    }>(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: systemPrompt }, ...formattedMessages],
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
        }
      }
    )
    console.log('result')
    console.log(response.data.choices[0].message.content)
    const result = (await xml2js.parseStringPromise(response.data.choices[0].message.content, {
      trim: true
    })) as { response: DeepSeekResponse }

    return result.response
  } catch (error) {
    console.error('Error calling DeepSeek API:', error)
    throw error
  }
}

let mainWindow: BrowserWindow
function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  mcpHub = new McpHub()
  await mcpHub.initializeMcpServers()
  systemPrompt = await SYSTEM_PROMPT(mcpHub)

  ipcMain.handle('call-deepseek', async (event: IpcMainInvokeEvent, messages: Message[]) => {
    try {
      const response = await recursivelyCallRequest(messages)
      return response
    } catch (error) {
      showErrorMessage('DeepSeek API呼び出しエラー')
      throw error
    }
  })

  ipcMain.handle('get-mcp-servers', () => {
    try {
      const servers = mcpHub.getServers()
      return servers
    } catch (error) {
      showErrorMessage(
        typeof error === 'string' ? error : error instanceof Error ? error : String(error)
      )
      throw error
    }
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 画面にメッセージを表示する関数
export function showInformationMessage(message: string): void {
  mainWindow.webContents.send('information-message', message)
}

// 画面に警告メッセージを表示する関数
export function showWarningMessage(warning: Error | string): void {
  const warningMessage = typeof warning === 'string' ? warning : warning.message
  mainWindow.webContents.send('warning-message', warningMessage)
}

// 画面にエラーメッセージを表示する関数
export function showErrorMessage(error: Error | string): void {
  const errorMessage = typeof error === 'string' ? error : error.message
  mainWindow.webContents.send('error-message', errorMessage)
}
