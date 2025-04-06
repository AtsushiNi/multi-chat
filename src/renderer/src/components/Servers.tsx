import React, { useEffect, useState, useCallback } from 'react'
import { Tabs, Card, Row, Col, Button, Collapse, Avatar, Tag } from 'antd'
import { GithubFilled, StarFilled } from '@ant-design/icons'
import { McpServer } from '@renderer/types/McpTypes'
import { useOutletContext } from 'react-router-dom'

type McpServerDetail = McpServer & {
  githubUrl: string
  author: string
  description: string
  readmeContent: string
  llmsInstallationContent: string
  requiresApiKey: boolean
}

const { Panel } = Collapse

const Servers: React.FC = () => {
  const [installedServers, setInstalledServers] = useState<McpServer[]>([])
  const [recommendedServers, setRecommendedServers] = useState<McpServerDetail[]>([])
  const [windowHeight, setWindowHeight] = useState(window.innerHeight)

  const { onMessagesUpdate, onAddConversation } =
    useOutletContext<any>()

  const handleResize = useCallback((): void => {
    setWindowHeight(window.innerHeight)
  }, [])

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return (): void => {
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize])

  useEffect(() => {
    const fetchRecommendedServers = async (): Promise<void> => {
      try {
        const servers = await window.api.getRecommendedServers()
        setRecommendedServers(servers)
      } catch (error) {
        console.error('推奨サーバー情報の取得に失敗しました:', error)
      }
    }
    fetchRecommendedServers()
  }, [])

  useEffect(() => {
    const fetchServers = async (): Promise<void> => {
      try {
        const servers = await window.api.getMcpServers()
        setInstalledServers(servers)
      } catch (error) {
        console.error('サーバー情報の取得に失敗しました:', error)
      }
    }
    fetchServers()
  }, [])

  const items = [
    {
      key: 'recommended',
      label: '推奨サーバー',
      children: (
        <div
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            maxHeight: `${windowHeight - 200}px`,
            width: '100%'
          }}
        >
          <Row gutter={[16, 16]} style={{ width: '100%' }}>
            {recommendedServers.map((server, index) => (
              <Col xs={24} sm={12} md={12} lg={12} key={index}>
                <Card
                  title={
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar src={server.logoUrl} style={{ marginRight: 8 }} />
                        <span style={{ fontWeight: 'bold' }}>{server.name}</span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#666',
                          marginLeft: 32,
                          display: 'flex',
                          gap: '16px'
                        }}
                      >
                        <span>
                          <GithubFilled /> {server.author}
                        </span>
                        <span>
                          <StarFilled /> {server.githubStars}
                        </span>
                      </div>
                    </div>
                  }
                  bordered={false}
                  extra={
                    <Button 
                      type="primary" 
                      size="small" 
                      style={{ fontSize: 10 }}
                      onClick={async () => {
                        try {
                          // 新しい会話を作成
                          const conversationId = onAddConversation()

                          // GitHub URLからリポジトリパスを抽出
                          const repoPath = server.githubUrl
                            .replace('https://github.com/', '')
                            .replace(/\/$/, '')

                          // READMEを取得
                          const readme = await window.api.fetchGithubReadme(server.githubUrl)

                          // メッセージを作成
                          const newMessage = {
                            content: `以下のGitHubリポジトリを参考にしてインストールしてください:\n\n${readme}`,
                            role: 'user'
                          }
                          onMessagesUpdate(conversationId, newMessage)

                          // DeepSeek APIを呼び出し
                          const response = await window.api.callDeepseek([newMessage])
                          const aiMessage = {
                            content: response,
                            role: 'assistant'
                          }
                          onMessagesUpdate(conversationId, aiMessage)
                        } catch (error) {
                          console.error('インストールリクエストに失敗しました:', error)
                        }
                      }}
                    >
                      インストール
                    </Button>
                  }
                >
                  {server.description || server.config}
                  {server.tags && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {server.tags.map((tag, i) => (
                        <Tag key={i} bordered={false} color="default">
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )
    },
    {
      key: 'installed',
      label: 'インストール済',
      children: (
        <Collapse accordion>
          {installedServers.map((server, index) => (
            <Panel header={server.name} key={index}>
              <Tabs
                items={[
                  {
                    key: 'tools',
                    label: 'ツール',
                    children: (
                      <ul>{server.tools?.map((tool, i) => <li key={i}>{tool.name}</li>)}</ul>
                    )
                  },
                  {
                    key: 'resources',
                    label: 'リソース',
                    children: (
                      <ul>
                        {server.resources?.map((resource, i) => <li key={i}>{resource.name}</li>)}
                      </ul>
                    )
                  },
                  {
                    key: 'prompt',
                    label: 'プロンプト',
                    children: (
                      <ul>
                        {server.resourceTemplates?.map((template, i) => (
                          <li key={i}>{template.name}</li>
                        ))}
                      </ul>
                    )
                  }
                ]}
              />
            </Panel>
          ))}
        </Collapse>
      )
    }
  ]

  return (
    <div>
      <h2>MCP サーバー</h2>
      <Tabs items={items} defaultActiveKey="recommended" />
    </div>
  )
}

export default Servers
