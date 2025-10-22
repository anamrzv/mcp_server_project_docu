#!/usr/bin/env node

import { config } from 'dotenv';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    McpError,
    ErrorCode
} from "@modelcontextprotocol/sdk/types.js";
import { ADTClient, session_types } from "abap-adt-api";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { AuthHandler } from './tool_handlers/AuthHandler.js';
import { ObjectHandler } from './tool_handlers/ObjectHandler.js';
import { ClassHandler } from './tool_handlers/ClassHandler.js';
import { CodeAnalysisHandler } from './tool_handlers/CodeAnalysisHandler.js';
import { DiscoveryHandler } from './tool_handlers/DiscoveryHandler.js';
import { DdicHandler } from './tool_handlers/DdicHandler.js';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: path.resolve(__dirname, '../.env') });

export class AbapAdtServer extends Server {
    private adtClient: ADTClient;
    private authHandler: AuthHandler;
    private objectHandler: ObjectHandler;
    private classHandler: ClassHandler;
    private codeAnalysisHandler: CodeAnalysisHandler;
    private discoveryHandler: DiscoveryHandler;
    private ddicHandler: DdicHandler;

    constructor() {
        super(
            {
                name: "mcp-atlas-server",
                version: "0.1.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        const missingVars = ['SAP_URL', 'SAP_USER', 'SAP_PASSWORD'].filter(v => !process.env[v]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        this.adtClient = new ADTClient(
            process.env.SAP_URL as string,
            process.env.SAP_USER as string,
            process.env.SAP_PASSWORD as string,
            process.env.SAP_CLIENT as string,
            process.env.SAP_LANGUAGE as string
        );
        this.adtClient.stateful = session_types.stateful

        this.authHandler = new AuthHandler(this.adtClient);
        this.objectHandler = new ObjectHandler(this.adtClient);
        this.classHandler = new ClassHandler(this.adtClient);
        this.codeAnalysisHandler = new CodeAnalysisHandler(this.adtClient);
        this.discoveryHandler = new DiscoveryHandler(this.adtClient);
        this.ddicHandler = new DdicHandler(this.adtClient);
        this.setupToolHandlers();
    }

    private serializeResult(result: any) {
        try {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(result, (key, value) =>
                        typeof value === 'bigint' ? value.toString() : value
                    )
                }]
            };
        } catch (error) {
            return this.handleError(new McpError(
                ErrorCode.InternalError,
                'Failed to serialize result'
            ));
        }
    }

    private handleError(error: unknown) {
        if (!(error instanceof Error)) {
            error = new Error(String(error));
        }
        if (error instanceof McpError) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: error.message,
                        code: error.code
                    })
                }],
                isError: true
            };
        }
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: 'Internal server error',
                    code: ErrorCode.InternalError
                })
            }],
            isError: true
        };
    }

    private setupToolHandlers() {
        this.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    ...this.authHandler.getTools(),
                    ...this.objectHandler.getTools(),
                    ...this.classHandler.getTools(),
                    ...this.codeAnalysisHandler.getTools(),
                    ...this.ddicHandler.getTools(),
                    ...this.discoveryHandler.getTools(),
                    {
                        name: 'healthcheck',
                        description: 'Check server health and connectivity',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    }
                ]
            };
        });

        this.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                let result: any;

                switch (request.params.name) {
                    case 'login':
                    case 'logout':
                    case 'dropSession':
                        result = await this.authHandler.handle(request.params.name, request.params.arguments);
                        break;
                    case 'objectStructure':
                    case 'searchObject':
                    case 'findObjectPath':
                    case 'objectTypes':
                    case 'getObjectSource':
                        result = await this.objectHandler.handle(request.params.name, request.params.arguments);
                        break;
                    case 'classIncludes':
                    case 'classComponents':
                    case 'bindingDetails':
                        result = await this.classHandler.handle(request.params.name, request.params.arguments);
                        break;
                    case 'findDefinition':
                    case 'usageReferences':
                    case 'usageReferenceSnippets':
                    case 'fragmentMappings':
                    case 'abapDocumentation':
                    case 'nodeContents':
                    case 'mainPrograms':
                        result = await this.codeAnalysisHandler.handle(request.params.name, request.params.arguments);
                        break;
                    case 'featureDetails':
                    case 'collectionFeatureDetails':
                    case 'findCollectionByUrl':
                    case 'loadTypes':
                    case 'adtDiscovery':
                    case 'adtCoreDiscovery':
                    case 'adtCompatibiliyGraph':
                    case 'revisions':
                        result = await this.discoveryHandler.handle(request.params.name, request.params.arguments);
                        break;
                    case 'annotationDefinitions':
                    case 'ddicElement':
                    case 'ddicRepositoryAccess':
                    case 'packageSearchHelp':
                    case 'tableContents':
                    case 'runQuery':
                        result = await this.ddicHandler.handle(request.params.name, request.params.arguments);
                        break;
                    case 'healthcheck':
                        result = { status: 'healthy', timestamp: new Date().toISOString() };
                        break;
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
                }

                return this.serializeResult(result);
            } catch (error) {
                return this.handleError(error);
            }
        });
    }
}

const server = new AbapAdtServer();

const app = express();
app.use(express.json());

app.post('/mcp', async (req: express.Request, res: express.Response) => {
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
    });

    res.on('close', () => {
        transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || '3000');
app.listen(port, () => {
    console.log(`Demo MCP Server running on http://localhost:${port}/mcp`);
}).on('error', (error: Error) => {
    console.error('Server error:', error);
    process.exit(1);
});