import { createOpenAPIHandler } from "./openapi"
import * as schema from "../db/schema"
const { GET: openapiGET } = createOpenAPIHandler(schema, {
    info: {
        title: 'My Database API',
        version: '1.0.0',
        description: 'Auto-generated API for database operations'
    },
    servers: [
        { url: 'http://localhost:3000', description: 'Development' },
        { url: 'https://api.myapp.com', description: 'Production' }
    ]
})

export { openapiGET }
