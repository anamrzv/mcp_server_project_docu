import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { BaseHandler } from './BaseHandler.js';
import type { ToolDefinition } from '../types/tools.js';
import { ADTClient } from 'abap-adt-api';

export class CodeAnalysisHandler extends BaseHandler {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'findDefinition',
                description: 'Find symbol definition',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string' },
                        source: { type: 'string' },
                        line: { type: 'number' },
                        startCol: { type: 'number' },
                        endCol: { type: 'number' },
                        implementation: { type: 'boolean', optional: true },
                        mainProgram: { type: 'string', optional: true }
                    },
                    required: ['url', 'source', 'line', 'startCol', 'endCol']
                }
            },
            {
                name: 'usageReferences',
                description: 'Find symbol references',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string' },
                        line: { type: 'number', optional: true },
                        column: { type: 'number', optional: true }
                    },
                    required: ['url']
                }
            },
            {
                name: 'usageReferenceSnippets',
                description: 'Retrieves usage reference snippets.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        references: { type: 'array' }
                    },
                    required: ['references']
                }
            },
            {
                name: 'fragmentMappings',
                description: 'Retrieves fragment mappings.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string' },
                        type: { type: 'string' },
                        name: { type: 'string' }
                    },
                    required: ['url', 'type', 'name']
                }
            },
            {
                name: 'abapDocumentation',
                description: 'Retrieves ABAP documentation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        objectUri: { type: 'string' },
                        body: { type: 'string' },
                        line: { type: 'number' },
                        column: { type: 'number' },
                        language: { type: 'string', optional: true }
                    },
                    required: ['objectUri', 'body', 'line', 'column']
                }
            },
            {
                name: 'nodeContents',
                description: 'Retrieves the contents of a node in the ABAP repository tree.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        parent_type: {
                            type: 'string',
                            description: 'The type of the parent node.'
                        },
                        parent_name: {
                            type: 'string',
                            description: 'The name of the parent node.',
                            optional: true
                        },
                        user_name: {
                            type: 'string',
                            description: 'The user name.',
                            optional: true
                        },
                        parent_tech_name: {
                            type: 'string',
                            description: 'The technical name of the parent node.',
                            optional: true
                        },
                        rebuild_tree: {
                            type: 'boolean',
                            description: 'Whether to rebuild the tree.',
                            optional: true
                        },
                        parentnodes: {
                            type: 'array',
                            description: 'An array of parent node IDs.',
                            optional: true
                        },
                    },
                    required: ['parent_type']
                }
            },
            {
                name: 'mainPrograms',
                description: 'Retrieves the main programs for a given include.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        includeUrl: {
                            type: 'string',
                            description: 'The URL of the include.'
                        }
                    },
                    required: ['includeUrl']
                }
            }
        ];
    }

    async handle(toolName: string, args: any): Promise<any> {
        switch (toolName) {
            case 'findDefinition':
                return this.handleFindDefinition(args);
            case 'usageReferences':
                return this.handleUsageReferences(args);
            case 'usageReferenceSnippets':
                return this.handleUsageReferenceSnippets(args);
            case 'fragmentMappings':
                return this.handleFragmentMappings(args);
            case 'abapDocumentation':
                return this.handleAbapDocumentation(args);
            case 'nodeContents':
                return this.handleNodeContents(args);
            case 'mainPrograms':
                return this.handleMainPrograms(args);
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown code analysis tool: ${toolName}`);
        }
    }
    

    async handleFindDefinition(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            const result = await this.adtclient.findDefinition(
                args.url,
                args.source,
                args.line,
                args.startCol,
                args.endCol,
                args.implementation,
                args.mainProgram
            );
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            result
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Find definition failed: ${error.message || 'Unknown error'}`
            );
        }
    }

    async handleUsageReferences(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            const result = await this.adtclient.usageReferences(
                args.url,
                args.line,
                args.column
            );
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            result
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Usage references failed: ${error.message || 'Unknown error'}`
            );
        }
    }


    async handleUsageReferenceSnippets(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            const result = await this.adtclient.usageReferenceSnippets(args.references);
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            result
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Usage reference snippets failed: ${error.message || 'Unknown error'}`
            );
        }
    }


    async handleFragmentMappings(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            const result = await this.adtclient.fragmentMappings(args.url, args.type, args.name);
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            result
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Fragment mappings failed: ${error.message || 'Unknown error'}`
            );
        }
    }

    async handleAbapDocumentation(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            const result = await this.adtclient.abapDocumentation(args.objectUri, args.body, args.line, args.column, args.language);
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            result
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `ABAP documentation failed: ${error.message || 'Unknown error'}`
            );
        }
    }

    async handleNodeContents(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            const nodeContents = await this.adtclient.nodeContents(
                args.parent_type,
                args.parent_name,
                args.user_name,
                args.parent_tech_name,
                args.rebuild_tree,
                args.parentnodes
            );
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            nodeContents
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get node contents: ${error.message || 'Unknown error'}`
            );
        }
    }

    async handleMainPrograms(args: any): Promise<any> {
        const startTime = performance.now();
        try {
            const mainPrograms = await this.adtclient.mainPrograms(args.includeUrl);
            this.trackRequest(startTime, true);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            status: 'success',
                            mainPrograms
                        })
                    }
                ]
            };
        } catch (error: any) {
            this.trackRequest(startTime, false);
            throw new McpError(
                ErrorCode.InternalError,
                `Failed to get main programs: ${error.message || 'Unknown error'}`
            );
        }
    }
}