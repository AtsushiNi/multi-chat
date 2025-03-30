import os from 'os'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
  StdioClientTransport,
  StdioServerParameters
} from '@modelcontextprotocol/sdk/client/stdio.js'
import {
  CallToolResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema
} from '@modelcontextprotocol/sdk/types.js'
import { setTimeout as setTimeoutPromise } from 'node:timers/promises'
import deepEqual from 'fast-deep-equal'
import * as fs from 'fs/promises'
import * as path from 'path'
import { showInformationMessage, showWarningMessage, showErrorMessage } from './index'
import {
  DEFAULT_MCP_TIMEOUT_SECONDS,
  MIN_MCP_TIMEOUT_SECONDS,
  McpResource,
  McpResourceResponse,
  McpResourceTemplate,
  McpServer,
  McpTool,
  McpToolCallResponse,
  McpConnection,
  StdioConfigSchema
} from './types/McpHubTypes'

export class McpHub {
  connections: McpConnection[] = []
  isConnecting: boolean = false

  getServers(): McpServer[] {
    // Only return enabled servers
    return this.connections.filter((conn) => !conn.server.disabled).map((conn) => conn.server)
  }

  async getMcpSettingsFilePath(): Promise<string> {
    const settingsDir = path.join(process.env.HOME || os.homedir(), '.multi-chat')
    try {
      await fs.mkdir(settingsDir, { recursive: true })
    } catch (error) {
      console.error(`Failed to create settings directory: ${error}`)
    }
    const mcpSettingsFilePath = path.join(settingsDir, 'mcp_settings.json')
    const fileExists = await this.fileExistsAtPath(mcpSettingsFilePath)
    if (!fileExists) {
      await fs.writeFile(
        mcpSettingsFilePath,
        `{
  "mcpServers": {
    
  }
}`
      )
    }
    return mcpSettingsFilePath
  }

  async initializeMcpServers(): Promise<void> {
    try {
      const settingsPath = await this.getMcpSettingsFilePath()
      const content = await fs.readFile(settingsPath, 'utf-8')
      const config = JSON.parse(content)
      await this.updateServerConnections(config.mcpServers || {})
    } catch (error) {
      console.error('Failed to initialize MCP servers:', error)
    }
  }

  private async connectToServer(name: string, config: StdioServerParameters): Promise<void> {
    // Remove existing connection if it exists (should never happen, the connection should be deleted beforehand)
    this.connections = this.connections.filter((conn) => conn.server.name !== name)

    try {
      // Each MCP server requires its own transport connection and has unique capabilities, configurations, and error handling. Having separate clients also allows proper scoping of resources/tools and independent server management like reconnection.
      const client = new Client(
        {
          name: 'Cline',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      )

      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: {
          ...config.env,
          ...(process.env.PATH ? { PATH: process.env.PATH } : {})
          // ...(process.env.NODE_PATH ? { NODE_PATH: process.env.NODE_PATH } : {}),
        },
        stderr: 'pipe' // necessary for stderr to be available
      })

      transport.onerror = async (error): Promise<void> => {
        console.error(`Transport error for "${name}":`, error)
        const connection = this.connections.find((conn) => conn.server.name === name)
        if (connection) {
          connection.server.status = 'disconnected'
          this.appendErrorMessage(connection, error.message)
        }
      }

      transport.onclose = async (): Promise<void> => {
        const connection = this.connections.find((conn) => conn.server.name === name)
        if (connection) {
          connection.server.status = 'disconnected'
        }
      }

      // If the config is invalid, show an error
      if (!StdioConfigSchema.safeParse(config).success) {
        console.error(`Invalid config for "${name}": missing or invalid parameters`)
        const connection: McpConnection = {
          server: {
            name,
            config: JSON.stringify(config),
            status: 'disconnected',
            error: 'Invalid config: missing or invalid parameters'
          },
          client,
          transport
        }
        this.connections.push(connection)
        return
      }

      // valid schema
      const parsedConfig = StdioConfigSchema.parse(config)
      const connection: McpConnection = {
        server: {
          name,
          config: JSON.stringify(config),
          status: 'connecting',
          disabled: parsedConfig.disabled
        },
        client,
        transport
      }
      this.connections.push(connection)

      // transport.stderr is only available after the process has been started. However we can't start it separately from the .connect() call because it also starts the transport. And we can't place this after the connect call since we need to capture the stderr stream before the connection is established, in order to capture errors during the connection process.
      // As a workaround, we start the transport ourselves, and then monkey-patch the start method to no-op so that .connect() doesn't try to start it again.
      await transport.start()
      const stderrStream = transport.stderr
      if (stderrStream) {
        stderrStream.on('data', async (data: Buffer) => {
          const errorOutput = data.toString()
          console.error(`Server "${name}" stderr:`, errorOutput)
          const connection = this.connections.find((conn) => conn.server.name === name)
          if (connection) {
            // NOTE: we do not set server status to "disconnected" because stderr logs do not necessarily mean the server crashed or disconnected, it could just be informational. In fact when the server first starts up, it immediately logs "<name> server running on stdio" to stderr.
            this.appendErrorMessage(connection, errorOutput)
          }
        })
      } else {
        console.error(`No stderr stream for ${name}`)
      }
      transport.start = async (): Promise<void> => {} // No-op now, .connect() won't fail

      // Connect
      await client.connect(transport)
      connection.server.status = 'connected'
      connection.server.error = ''

      // Initial fetch of tools and resources
      connection.server.tools = await this.fetchToolsList(name)
      connection.server.resources = await this.fetchResourcesList(name)
      connection.server.resourceTemplates = await this.fetchResourceTemplatesList(name)
    } catch (error) {
      // Update status with error
      const connection = this.connections.find((conn) => conn.server.name === name)
      if (connection) {
        connection.server.status = 'disconnected'
        this.appendErrorMessage(connection, error instanceof Error ? error.message : String(error))
      }
      throw error
    }
  }

  private appendErrorMessage(connection: McpConnection, error: string): void {
    const newError = connection.server.error ? `${connection.server.error}\n${error}` : error
    connection.server.error = newError //.slice(0, 800)
  }

  private async fetchToolsList(serverName: string): Promise<McpTool[]> {
    try {
      const response = await this.connections
        .find((conn) => conn.server.name === serverName)
        ?.client.request({ method: 'tools/list' }, ListToolsResultSchema)

      // Get autoApprove settings
      const settingsPath = await this.getMcpSettingsFilePath()
      const content = await fs.readFile(settingsPath, 'utf-8')
      const config = JSON.parse(content)
      const autoApproveConfig = config.mcpServers[serverName]?.autoApprove || []

      // Mark tools as always allowed based on settings
      const tools = (response?.tools || []).map((tool) => ({
        ...tool,
        autoApprove: autoApproveConfig.includes(tool.name)
      }))

      // console.log(`[MCP] Fetched tools for ${serverName}:`, tools)
      return tools
    } catch (error) {
      console.error(`Failed to fetch tools for ${serverName}:`, error)
      return []
    }
  }

  private async fetchResourcesList(serverName: string): Promise<McpResource[]> {
    try {
      const response = await this.connections
        .find((conn) => conn.server.name === serverName)
        ?.client.request({ method: 'resources/list' }, ListResourcesResultSchema)
      return response?.resources || []
    } catch (error) {
      console.error(`Failed to fetch resources for ${serverName}:`, error)
      return []
    }
  }

  private async fetchResourceTemplatesList(serverName: string): Promise<McpResourceTemplate[]> {
    try {
      const response = await this.connections
        .find((conn) => conn.server.name === serverName)
        ?.client.request({ method: 'resources/templates/list' }, ListResourceTemplatesResultSchema)
      return response?.resourceTemplates || []
    } catch (error) {
      console.error(`Failed to fetch resource templates for ${serverName}:`, error)
      return []
    }
  }

  async deleteConnection(name: string): Promise<void> {
    const connection = this.connections.find((conn) => conn.server.name === name)
    if (connection) {
      try {
        await connection.transport.close()
        await connection.client.close()
      } catch (error) {
        console.error(`Failed to close transport for ${name}:`, error)
      }
      this.connections = this.connections.filter((conn) => conn.server.name !== name)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateServerConnections(newServers: Record<string, any>): Promise<void> {
    this.isConnecting = true
    const currentNames = new Set(this.connections.map((conn) => conn.server.name))
    const newNames = new Set(Object.keys(newServers))

    // Delete removed servers
    for (const name of currentNames) {
      if (!newNames.has(name)) {
        await this.deleteConnection(name)
        console.log(`Deleted MCP server: ${name}`)
      }
    }

    // Update or add servers
    for (const [name, config] of Object.entries(newServers)) {
      const currentConnection = this.connections.find((conn) => conn.server.name === name)

      if (!currentConnection) {
        // New server
        try {
          await this.connectToServer(name, config)
        } catch (error) {
          console.error(`Failed to connect to new MCP server ${name}:`, error)
        }
      } else if (!deepEqual(JSON.parse(currentConnection.server.config), config)) {
        // Existing server with changed config
        try {
          await this.deleteConnection(name)
          await this.connectToServer(name, config)
          console.log(`Reconnected MCP server with updated config: ${name}`)
        } catch (error) {
          console.error(`Failed to reconnect MCP server ${name}:`, error)
        }
      }
      // If server exists with same config, do nothing
    }
    this.isConnecting = false
  }

  async restartConnection(serverName: string): Promise<void> {
    this.isConnecting = true

    // Get existing connection and update its status
    const connection = this.connections.find((conn) => conn.server.name === serverName)
    const config = connection?.server.config
    if (config) {
      showInformationMessage(`Restarting ${serverName} MCP server...`)
      connection.server.status = 'connecting'
      connection.server.error = ''
      await setTimeoutPromise(500) // artificial delay to show user that server is restarting
      try {
        await this.deleteConnection(serverName)
        // Try to connect again using existing config
        await this.connectToServer(serverName, JSON.parse(config))
        showInformationMessage(`${serverName} MCP server connected`)
      } catch (error) {
        console.error(`Failed to restart connection for ${serverName}:`, error)
        showErrorMessage(`Failed to connect to ${serverName} MCP server`)
      }
    }

    this.isConnecting = false
  }

  // Using server

  // Public methods for server management

  public async toggleServerDisabled(serverName: string, disabled: boolean): Promise<void> {
    let settingsPath: string
    try {
      settingsPath = await this.getMcpSettingsFilePath()

      // Ensure the settings file exists and is accessible
      try {
        await fs.access(settingsPath)
      } catch (error) {
        console.error('Settings file not accessible:', error)
        throw new Error('Settings file not accessible')
      }
      const content = await fs.readFile(settingsPath, 'utf-8')
      const config = JSON.parse(content)

      // Validate the config structure
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid config structure')
      }

      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        config.mcpServers = {}
      }

      if (config.mcpServers[serverName]) {
        // Create a new server config object to ensure clean structure
        const serverConfig = {
          ...config.mcpServers[serverName],
          disabled
        }

        // Ensure required fields exist
        if (!serverConfig.autoApprove) {
          serverConfig.autoApprove = []
        }

        config.mcpServers[serverName] = serverConfig

        // Write the entire config back
        const updatedConfig = {
          mcpServers: config.mcpServers
        }

        await fs.writeFile(settingsPath, JSON.stringify(updatedConfig, null, 2))

        const connection = this.connections.find((conn) => conn.server.name === serverName)
        if (connection) {
          try {
            connection.server.disabled = disabled

            // Only refresh capabilities if connected
            if (connection.server.status === 'connected') {
              connection.server.tools = await this.fetchToolsList(serverName)
              connection.server.resources = await this.fetchResourcesList(serverName)
              connection.server.resourceTemplates =
                await this.fetchResourceTemplatesList(serverName)
            }
          } catch (error) {
            console.error(`Failed to refresh capabilities for ${serverName}:`, error)
          }
        }

      }
    } catch (error) {
      console.error('Failed to update server disabled state:', error)
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack)
      }
      showErrorMessage(
        `Failed to update server state: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }

  async readResource(serverName: string, uri: string): Promise<McpResourceResponse> {
    const connection = this.connections.find((conn) => conn.server.name === serverName)
    if (!connection) {
      throw new Error(`No connection found for server: ${serverName}`)
    }
    if (connection.server.disabled) {
      throw new Error(`Server "${serverName}" is disabled`)
    }

    return await connection.client.request(
      {
        method: 'resources/read',
        params: {
          uri
        }
      },
      ReadResourceResultSchema
    )
  }

  async callTool(
    serverName: string,
    toolName: string,
    toolArguments?: Record<string, unknown>
  ): Promise<McpToolCallResponse> {
    const connection = this.connections.find((conn) => conn.server.name === serverName)
    if (!connection) {
      throw new Error(
        `No connection found for server: ${serverName}. Please make sure to use MCP servers available under 'Connected MCP Servers'.`
      )
    }

    if (connection.server.disabled) {
      throw new Error(`Server "${serverName}" is disabled and cannot be used`)
    }

    let timeout = this.secondsToMs(DEFAULT_MCP_TIMEOUT_SECONDS) // sdk expects ms

    try {
      const config = JSON.parse(connection.server.config)
      const parsedConfig = StdioConfigSchema.parse(config)
      timeout = this.secondsToMs(parsedConfig.timeout)
    } catch (error) {
      console.error(`Failed to parse timeout configuration for server ${serverName}: ${error}`)
    }

    return await connection.client.request(
      {
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: toolArguments
        }
      },
      CallToolResultSchema,
      {
        timeout
      }
    )
  }

  async toggleToolAutoApprove(
    serverName: string,
    toolName: string,
    shouldAllow: boolean
  ): Promise<void> {
    try {
      const settingsPath = await this.getMcpSettingsFilePath()
      const content = await fs.readFile(settingsPath, 'utf-8')
      const config = JSON.parse(content)

      // Initialize autoApprove if it doesn't exist
      if (!config.mcpServers[serverName].autoApprove) {
        config.mcpServers[serverName].autoApprove = []
      }

      const autoApprove = config.mcpServers[serverName].autoApprove
      const toolIndex = autoApprove.indexOf(toolName)

      if (shouldAllow && toolIndex === -1) {
        // Add tool to autoApprove list
        autoApprove.push(toolName)
      } else if (!shouldAllow && toolIndex !== -1) {
        // Remove tool from autoApprove list
        autoApprove.splice(toolIndex, 1)
      }

      await fs.writeFile(settingsPath, JSON.stringify(config, null, 2))

      // Update the tools list to reflect the change
      const connection = this.connections.find((conn) => conn.server.name === serverName)
      if (connection) {
        connection.server.tools = await this.fetchToolsList(serverName)
      }
    } catch (error) {
      console.error('Failed to update autoApprove settings:', error)
      showErrorMessage('Failed to update autoApprove settings')
      throw error // Re-throw to ensure the error is properly handled
    }
  }

  public async deleteServer(serverName: string): Promise<void> {
    try {
      const settingsPath = await this.getMcpSettingsFilePath()
      const content = await fs.readFile(settingsPath, 'utf-8')
      const config = JSON.parse(content)
      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        config.mcpServers = {}
      }
      if (config.mcpServers[serverName]) {
        delete config.mcpServers[serverName]
        const updatedConfig = {
          mcpServers: config.mcpServers
        }
        await fs.writeFile(settingsPath, JSON.stringify(updatedConfig, null, 2))
        await this.updateServerConnections(config.mcpServers)
        showInformationMessage(`Deleted ${serverName} MCP server`)
      } else {
        showWarningMessage(`${serverName} not found in MCP configuration`)
      }
    } catch (error) {
      showErrorMessage(
        `Failed to delete MCP server: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }

  public async updateServerTimeout(serverName: string, timeout: number): Promise<void> {
    try {
      // Validate timeout against schema
      const setConfigResult = StdioConfigSchema.shape.timeout.safeParse(timeout)
      if (!setConfigResult.success) {
        throw new Error(
          `Invalid timeout value: ${timeout}. Must be at minimum ${MIN_MCP_TIMEOUT_SECONDS} seconds.`
        )
      }

      const settingsPath = await this.getMcpSettingsFilePath()
      const content = await fs.readFile(settingsPath, 'utf-8')
      const config = JSON.parse(content)

      if (!config.mcpServers?.[serverName]) {
        throw new Error(`Server "${serverName}" not found in settings`)
      }

      config.mcpServers[serverName] = {
        ...config.mcpServers[serverName],
        timeout
      }

      await fs.writeFile(settingsPath, JSON.stringify(config, null, 2))

      await this.updateServerConnections(config.mcpServers)
    } catch (error) {
      console.error('Failed to update server timeout:', error)
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack)
      }
      showErrorMessage(
        `Failed to update server timeout: ${error instanceof Error ? error.message : String(error)}`
      )
      throw error
    }
  }

  async dispose(): Promise<void> {
    for (const connection of this.connections) {
      try {
        await this.deleteConnection(connection.server.name)
      } catch (error) {
        console.error(`Failed to close connection for ${connection.server.name}:`, error)
      }
    }
    this.connections = []
  }

  /**
   * Helper function to check if a path exists.
   *
   * @param path - The path to check.
   * @returns A promise that resolves to true if the path exists, false otherwise.
   */
  async fileExistsAtPath(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  secondsToMs(seconds: number): number {
    return seconds * 1000
  }
}
