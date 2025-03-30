import { z } from 'zod'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

export const DEFAULT_MCP_TIMEOUT_SECONDS = 60
export const MIN_MCP_TIMEOUT_SECONDS = 1

export type McpResource = {
  uri: string
  name: string
  mimeType?: string
  description?: string
}

export type McpResourceResponse = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _meta?: Record<string, any>
  contents: Array<{
    uri: string
    mimeType?: string
    text?: string
    blob?: string
  }>
}

export type McpResourceTemplate = {
  uriTemplate: string
  name: string
  description?: string
  mimeType?: string
}

export type McpServer = {
  name: string
  config: string
  status: 'connected' | 'connecting' | 'disconnected'
  error?: string
  tools?: McpTool[]
  resources?: McpResource[]
  resourceTemplates?: McpResourceTemplate[]
  disabled?: boolean
  timeout?: number
}

export type McpTool = {
  name: string
  description?: string
  inputSchema?: object
  autoApprove?: boolean
}

export type McpToolCallResponse = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _meta?: Record<string, any>
  content: Array<
    | {
        type: 'text'
        text: string
      }
    | {
        type: 'image'
        data: string
        mimeType: string
      }
    | {
        type: 'resource'
        resource: {
          uri: string
          mimeType?: string
          text?: string
          blob?: string
        }
      }
  >
  isError?: boolean
}

export type McpConnection = {
  server: McpServer
  client: Client
  transport: StdioClientTransport
}

export type McpTransportType = 'stdio' | 'sse'

export type McpServerConfig = {
  transportType: McpTransportType
  autoApprove?: string[]
  disabled?: boolean
  timeout?: number
} & (
  | {
      transportType: 'stdio'
      command: string
      args?: string[]
      env?: Record<string, string>
    }
  | {
      transportType: 'sse'
      url: string
      headers?: Record<string, string>
      withCredentials?: boolean
    }
)

export const AutoApproveSchema = z.array(z.string()).default([])

export const StdioConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  autoApprove: AutoApproveSchema.optional(),
  disabled: z.boolean().optional(),
  timeout: z.number().min(MIN_MCP_TIMEOUT_SECONDS).optional().default(DEFAULT_MCP_TIMEOUT_SECONDS)
})
