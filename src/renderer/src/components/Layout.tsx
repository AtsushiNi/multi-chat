import React, { useEffect } from 'react'
import Sidebar from './Sidebar'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { createStyles } from 'antd-style'
import { useConversation } from '../hooks/useConversation'

const useStyle = createStyles(({ token, css }) => ({
  layout: css`
    width: 100%;
    min-width: 1000px;
    height: 100vh;
    border-radius: ${token.borderRadius}px;
    display: flex;
    background: ${token.colorBgContainer};
    font-family: AlibabaPuHuiTi, ${token.fontFamily}, sans-serif;
  `,
  content: css`
    flex: 1;
    padding: ${token.paddingLG}px;
  `
}))

const Layout: React.FC = () => {
  const { styles } = useStyle()
  const navigate = useNavigate()
  const { conversationId } = useParams()
  const { conversations, addMessage, createConversation, updateConversationTitle } = useConversation()

  useEffect(() => {
    if (!conversationId && conversations.length > 0) {
      navigate(`/chat/${conversations[0].id}`, { replace: true })
    }
  }, [])

  const onNavigateToServers = (): void => {
    navigate('/servers')
  }

  const onAddConversation = (): string => {
    const newId = createConversation(`New Conversation ${conversations.length}`)
    navigate(`/chat/${newId}`)
    return newId
  }

  const onConversationClick = (id: string): void => {
    navigate(`/chat/${id}`)
  }

  const activeConversation = conversations.find((conv) => conv.id === conversationId)

  return (
    <div className={styles.layout}>
      <Sidebar
        conversationsItems={conversations.map((conv) => ({
          key: conv.id,
          label: conv.title,
          messages: conv.messages
        }))}
        activeKey={conversationId || ''}
        onAddConversation={onAddConversation}
        onConversationClick={onConversationClick}
        onNavigateToServers={onNavigateToServers}
      />
      <div className={styles.content}>
        <Outlet
          context={{
            messages: activeConversation?.messages || [],
            conversationId,
            onMessagesUpdate: addMessage,
            updateConversationTitle,
            onAddConversation
          }}
        />
      </div>
    </div>
  )
}

export default Layout
