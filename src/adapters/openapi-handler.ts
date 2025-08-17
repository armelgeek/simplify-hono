
import { createOpenAPIHandler } from "./openapi"
import * as schema from "../db/schema"

type OpenAPIHandlerOptions = {
    info?: { title?: string; version?: string; description?: string }
    servers?: Array<{ url: string; description: string }>
    customRoutes?: Record<string, Record<string, boolean>>
    excludedTables?: string[]
}

// Factory to get openapiGET with excludedTables
    const options: OpenAPIHandlerOptions = {
        info: {
            title: 'My Database API',
            version: '1.0.0',
            description: 'Auto-generated API for database operations'
        },
        servers: [
            { url: 'http://localhost:3000', description: 'Development' },
            { url: 'https://api.myapp.com', description: 'Production' }
        ],
        excludedTables: excludedTables
    };
    return createOpenAPIHandler(schema, options).GET;
}
