export type McpServer = {
  name: string
  description?: string
  config: string
  status: 'connected' | 'connecting' | 'disconnected'
  error?: string
  tools?: McpTool[]
  resources?: McpResource[]
  resourceTemplates?: McpResourceTemplate[]
  disabled?: boolean
  timeout?: number
  isRecommended?: boolean
  logoUrl?: string
  author?: string
  githubStars?: number
  tags?: string[]
}

export type McpTool = {
  name: string
  description?: string
  inputSchema?: object
  autoApprove?: boolean
}

export type McpResource = {
  uri: string
  name: string
  mimeType?: string
  description?: string
}

export type McpResourceTemplate = {
  uriTemplate: string
  name: string
  description?: string
  mimeType?: string
}
