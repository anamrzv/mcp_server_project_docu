import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { BaseHandler } from './BaseHandler.js';
import type { ToolDefinition } from '../types/tools.js';

export class ObjectHandler extends BaseHandler {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'getObjects',
                description: 'Get objects by regex query. Returns objectURL',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query string'
                        },
                        objType: {
                            type: 'string',
                            description: 'Object type filter',
                            optional: true
                        },
                        max: {
                            type: 'number',
                            description: 'Maximum number of results',
                            optional: true
                        }
                    },
                    required: ['query']
                }
            },
            {
                name: 'getObjectStructure',
                description: 'Retrieves technical metadata and structural components of an ABAP object. Returns core attributes, object links, URIs for individual source segments (definitions, implementations, and test classes)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        objectUrl: {
                            type: 'string',
                            description: 'URL of the object'
                        },
                        version: {
                            type: 'string',
                            description: 'Version of the object',
                            optional: true
                        }
                    },
                    required: ['objectUrl']
                }
            },
            {
                name: 'getObjectSourceCode',
                description: 'Retrieves source code for a ABAP object. Use this tool when you need to read or analyze existing ABAP code.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    objectUrl: { type: 'string' },
                    options: { type: 'string' }
                  },
                  required: ['objectUrl']
                }
            },
            {
                name: 'getObjectPath',
                description: 'Retrieves the full hierarchical path of an ABAP object within the systems package structure, starting from its root package down to the object itself',
                inputSchema: {
                    type: 'object',
                    properties: {
                        objectUrl: {
                            type: 'string',
                            description: 'URL of the object to find path for'
                        }
                    },
                    required: ['objectUrl']
                }
            },
            {
                name: 'getObjectVersionHistory',
                description: 'Retrieves version history for a specific object or one of its includes. Returns list of revision links with the date and author of each change',
                inputSchema: {
                    type: 'object',
                    properties: {
                        objectUrl: {
                            type: 'string',
                            description: 'The URL of the object.'
                        },
                        clasInclude: {
                            type: 'string',
                            description: 'The class include.',
                            optional: true
                        }
                    },
                    required: ['objectUrl']
                }
            }
        ];
    }

    async handle(toolName: string, args: any): Promise<any> {
        switch (toolName) {
            case 'getObjects':
                return this.handleGetObjects(args);
            case 'getObjectStructure':
                return this.handleObjectStructure(args);
            case 'getObjectSourceCode':
                return this.handleGetObjectSourceCode(args);
            case 'getObjectPath':
                return this.handleGetObjectPath(args);
            case 'getObjectVersionHistory':
                return this.handleObjectVersionHistory(args);
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown object tool: ${toolName}`);
        }
    }

    async handleObjectStructure(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            const structure = await this.adtclient.objectStructure(args.objectUrl, args.version);
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            structure,
                            message: 'Object structure retrieved successfully'
                        }, null, 2)
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            const errorMessage = error.message || 'Unknown error';
            const detailedError = error.response?.data?.message || errorMessage;
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get object structure: ${detailedError}`
            );
        }
    }

    async handleGetObjectPath(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            const path = await this.adtclient.findObjectPath(args.objectUrl);
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            path,
                            message: 'Object path found successfully'
                        }, null, 2)
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            const errorMessage = error.message || 'Unknown error';
            const detailedError = error.response?.data?.message || errorMessage;
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to find object path: ${detailedError}`
            );
        }
    }

    async handleGetObjects(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            const results = await this.adtclient.searchObject(
                args.query,
                args.objType,
                args.max
            );
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            results,
                            message: 'Object search completed successfully'
                        }, null, 2)
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            const errorMessage = error.message || 'Unknown error';
            const detailedError = error.response?.data?.message || errorMessage;
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to search objects: ${detailedError}`
            );
        }
    }

    async handleReentranceTicket(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            const ticket = await this.adtclient.reentranceTicket();
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            ticket,
                            message: 'Reentrance ticket retrieved successfully'
                        }, null, 2)
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            const errorMessage = error.message || 'Unknown error';
            const detailedError = error.response?.data?.message || errorMessage;
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get reentrance ticket: ${detailedError}`
            );
        }
    }

    async handleGetObjectSourceCode(args: any): Promise<any> {
        const startTime = performance.now();
        try {
          const source = await this.adtclient.getObjectSource(`${args.objectSourceUrl}/source/main`, args.options);
          this.trackRequest(startTime, true);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'success',
                  source
                })
              }
            ]
          };
        } catch (error: any) {
          this.trackRequest(startTime, false);
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to get object source: ${error.message || 'Unknown error'}`
          );
        }
    }

    async handleObjectVersionHistory(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            const revisions = await this.adtclient.revisions(args.objectUrl, args.clasInclude);
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            revisions
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get revisions: ${error.message || 'Unknown error'}`
            );
        }
    }
}