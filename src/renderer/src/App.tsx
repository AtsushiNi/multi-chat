import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { message } from 'antd'
import { useEffect } from 'react'
import Chat from './components/Chat'
import Servers from './components/Servers'
import Layout from './components/Layout'
import { ConversationProvider } from './components/ConversationProvider'
import './assets/main.css'

const { ipcRenderer } = window.electron

function App(): JSX.Element {
  useEffect(() => {
    // 情報メッセージのリスナー
    ipcRenderer.on('information-message', (_, msg: string) => {
      message.info(msg)
    })

    // 警告メッセージのリスナー
    ipcRenderer.on('warning-message', (_, msg: string) => {
      message.warning(msg)
    })

    // エラーメッセージのリスナー
    ipcRenderer.on('error-message', (_, msg: string) => {
      message.error(msg)
    })

    return (): void => {
      ipcRenderer.removeAllListeners('information-message')
      ipcRenderer.removeAllListeners('warning-message')
      ipcRenderer.removeAllListeners('error-message')
    }
  }, [])

  return (
    <BrowserRouter>
      <ConversationProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Chat />} />
            <Route path="chat/:conversationId" element={<Chat />} />
            <Route path="servers" element={<Servers />} />
          </Route>
        </Routes>
      </ConversationProvider>
    </BrowserRouter>
  )
}

export default App
