import React, { useEffect, useState } from 'react'
import { Tabs, Card, Row, Col, Button, Collapse } from 'antd'
import { McpServer } from '@renderer/types/McpTypes'

const { Panel } = Collapse

const recommendedServers = [
  {
    title: '公式サーバー',
    description: '安定した公式サーバーで快適にチャットを楽しめます'
  },
  {
    title: '開発者サーバー',
    description: '最新機能を試せる開発者向けサーバー'
  },
  {
    title: 'コミュニティサーバー',
    description: '活発なコミュニティが特徴のサーバー'
  }
]

const Servers: React.FC = () => {
  const [installedServers, setInstalledServers] = useState<McpServer[]>([])

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
      label: '推奨',
      children: (
        <Row gutter={[16, 16]}>
          {recommendedServers.map((server, index) => (
            <Col span={8} key={index}>
              <Card
                title={server.title}
                bordered={false}
                extra={
                  <Button type="primary" size="small">
                    インストール
                  </Button>
                }
              >
                {server.description}
              </Card>
            </Col>
          ))}
        </Row>
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
