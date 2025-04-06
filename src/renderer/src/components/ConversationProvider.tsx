import React, { ReactNode, useState } from 'react'
import { ConversationContext, Conversation, Message } from '../contexts/ConversationContext'

export const ConversationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const defaultConversation: Conversation = {
    id: Date.now().toString(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date()
  }
  const [conversations, setConversations] = useState<Conversation[]>([defaultConversation])

  const addMessage = (conversationId: string, message: Message): void => {
    setConversations((prev) => {
      return prev.map((conv) =>
        conv.id === conversationId ? { ...conv, messages: [...conv.messages, message] } : conv
      )
    })
  }

  const createConversation = (title: string): string => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title,
      messages: [],
      createdAt: new Date()
    }
    setConversations((prev) => [...prev, newConversation])
    return newConversation.id
  }

  const updateConversationTitle = (conversationId: string, title: string): void => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === conversationId ? { ...conv, title } : conv))
    )
  }

  const value = {
    conversations,
    addMessage,
    createConversation,
    updateConversationTitle
  }

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>
}
