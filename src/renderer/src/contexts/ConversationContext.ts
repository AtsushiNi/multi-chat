import { createContext } from 'react'

export type ConversationContextType = {
  conversations: Conversation[]
  addMessage: (conversationId: string, message: Message) => void
  createConversation: (title: string) => string
  updateConversationTitle: (conversationId: string, title: string) => void
}

export type Conversation = {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

export type Message = {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

export const ConversationContext = createContext<ConversationContextType | undefined>(undefined)
