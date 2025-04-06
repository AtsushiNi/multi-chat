import { Attachments, Bubble, BubbleProps, Prompts, Sender, Welcome } from '@ant-design/x'
import { createStyles } from 'antd-style'
import React, { useState } from 'react'
import {
  CloudUploadOutlined,
  CommentOutlined,
  EllipsisOutlined,
  FireOutlined,
  HeartOutlined,
  PaperClipOutlined,
  ReadOutlined,
  ShareAltOutlined,
  SmileOutlined
} from '@ant-design/icons'
import { Badge, Button, type GetProp, Space, Typography } from 'antd'
import markdownit from 'markdown-it'
import { useOutletContext } from 'react-router-dom'
import { Message } from '../../../main/types/MessageTypes'

const renderTitle = (icon: React.ReactNode, title: string): React.ReactNode => (
  <Space align="start">
    {icon}
    <span>{title}</span>
  </Space>
)

const useStyle = createStyles(({ token, css }) => ({
  chat: css`
    height: 100%;
    width: 100%;
    max-width: 700px;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    padding: ${token.paddingLG}px;
    gap: 16px;
  `,
  messages: css`
    flex: 1;
  `,
  placeholder: css`
    padding-top: 32px;
  `,
  sender: css`
    box-shadow: ${token.boxShadow};
  `
}))

const placeholderPromptsItems: GetProp<typeof Prompts, 'items'> = [
  {
    key: '1',
    label: renderTitle(<FireOutlined style={{ color: '#FF4D4F' }} />, 'Hot Topics'),
    description: 'What are you interested in?',
    children: [
      {
        key: '1-1',
        description: `What's new in X?`
      },
      {
        key: '1-2',
        description: `What's AGI?`
      },
      {
        key: '1-3',
        description: `Where is the doc?`
      }
    ]
  },
  {
    key: '2',
    label: renderTitle(<ReadOutlined style={{ color: '#1890FF' }} />, 'Design Guide'),
    description: 'How to design a good product?',
    children: [
      {
        key: '2-1',
        icon: <HeartOutlined />,
        description: `Know the well`
      },
      {
        key: '2-2',
        icon: <SmileOutlined />,
        description: `Set the AI role`
      },
      {
        key: '2-3',
        icon: <CommentOutlined />,
        description: `Express the feeling`
      }
    ]
  }
]

const senderPromptsItems: GetProp<typeof Prompts, 'items'> = [
  {
    key: '1',
    description: 'Hot Topics',
    icon: <FireOutlined style={{ color: '#FF4D4F' }} />
  },
  {
    key: '2',
    description: 'Design Guide',
    icon: <ReadOutlined style={{ color: '#1890FF' }} />
  }
]

const roles: GetProp<typeof Bubble.List, 'roles'> = {
  ai: {
    placement: 'start',
    typing: { step: 5, interval: 20 },
    styles: {
      content: {
        borderRadius: 16
      }
    }
  },
  local: {
    placement: 'end',
    variant: 'shadow'
  }
}

interface ChatProps {
  messages: Message[]
  conversationId: string
  onMessagesUpdate: (conversationId: string, message: Message) => void
  updateConversationTitle: (conversationId: string, title: string) => void
}

const Chat: React.FC = () => {
  const { messages, conversationId, onMessagesUpdate, updateConversationTitle } =
    useOutletContext<ChatProps>()

  const { styles } = useStyle()

  const [headerOpen, setHeaderOpen] = useState(false)
  const [content, setContent] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<GetProp<typeof Attachments, 'items'>>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleRequest = async (message: string): Promise<void> => {
    if (!message) {
      return
    }

    const newMessage: Message = {
      content: message,
      role: 'user'
    }
    onMessagesUpdate(conversationId, newMessage)

    setIsLoading(true)
    try {
      const updatedMessages = [...messages, newMessage]
      const response = await window.api.callDeepseek(updatedMessages)
      const aiMessage: Message = {
        content: response,
        role: 'assistant'
      }
      onMessagesUpdate(conversationId, aiMessage)
    } catch (error) {
      console.error('API call failed:', error)
      const errorMessage: Message = {
        content:
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Sorry, there was an error processing your request.',
        role: 'assistant'
      }
      onMessagesUpdate(conversationId, errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // ==================== Event ====================
  const onSubmit = (nextContent: string): void => {
    if (!nextContent) return

    // 最初のメッセージの場合、先頭20文字を会話タイトルとして設定
    if (messages.length === 0) {
      const title = nextContent.slice(0, 20)
      updateConversationTitle(conversationId, title)
    }

    handleRequest(nextContent)
    setContent('')
  }

  const onPromptsItemClick: GetProp<typeof Prompts, 'onItemClick'> = (info) => {
    handleRequest(info.data.description as string)
  }

  const handleFileChange: GetProp<typeof Attachments, 'onChange'> = (info) => {
    setAttachedFiles(info.fileList)
  }

  // ==================== Nodes ====================
  const placeholderNode: React.ReactNode = (
    <Space direction="vertical" size={16} className={styles.placeholder}>
      <Welcome
        variant="borderless"
        icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
        title="Hello, I'm Ant Design X"
        description="Base on Ant Design, AGI product interface solution, create a better intelligent vision~"
        extra={
          <Space>
            <Button icon={<ShareAltOutlined />} />
            <Button icon={<EllipsisOutlined />} />
          </Space>
        }
      />
      <Prompts
        title="Do you want?"
        items={placeholderPromptsItems}
        styles={{
          list: {
            width: '100%'
          },
          item: {
            flex: 1
          }
        }}
        onItemClick={onPromptsItemClick}
      />
    </Space>
  )

  const md = markdownit({ html: true, breaks: true })
  const renderMarkdown: BubbleProps['messageRender'] = (content) => (
    <Typography>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: used in demo */}
      <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
    </Typography>
  )

  const items: GetProp<typeof Bubble.List, 'items'> = messages.map(({ content, role }, index) => ({
    key: `msg-${index}`,
    loading: false,
    role: role === 'user' ? 'local' : 'ai',
    content: renderMarkdown(content)
  }))

  const attachmentsNode = (
    <Badge dot={attachedFiles.length > 0 && !headerOpen}>
      <Button type="text" icon={<PaperClipOutlined />} onClick={() => setHeaderOpen(!headerOpen)} />
    </Badge>
  )

  const senderHeader = (
    <Sender.Header
      title="Attachments"
      open={headerOpen}
      onOpenChange={setHeaderOpen}
      styles={{
        content: {
          padding: 0
        }
      }}
    >
      <Attachments
        beforeUpload={() => false}
        items={attachedFiles}
        onChange={handleFileChange}
        placeholder={(type) =>
          type === 'drop'
            ? { title: 'Drop file here' }
            : {
                icon: <CloudUploadOutlined />,
                title: 'Upload files',
                description: 'Click or drag files to this area to upload'
              }
        }
      />
    </Sender.Header>
  )

  // ==================== Render =================
  return (
    <div className={styles.chat}>
      {/* 🌟 消息リスト */}
      <Bubble.List
        items={items.length > 0 ? items : [{ content: placeholderNode, variant: 'borderless' }]}
        roles={roles}
        className={styles.messages}
      />
      {/* 🌟 プロンプト */}
      <Prompts items={senderPromptsItems} onItemClick={onPromptsItemClick} />
      {/* 🌟 入力ボックス */}
      <Sender
        value={content}
        header={senderHeader}
        onSubmit={onSubmit}
        onChange={setContent}
        prefix={attachmentsNode}
        loading={isLoading}
        className={styles.sender}
      />
    </div>
  )
}

export default Chat
