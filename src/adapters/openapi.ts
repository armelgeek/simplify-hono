interface OpenAPISchema {
    openapi: string
    info: {
        title: string
        version: string
        description: string
    }
    servers: Array<{ url: string; description: string }>
    paths: Record<string, any>
    components: {
        schemas: Record<string, any>
        responses: Record<string, any>
    }
}

/**
 * Generates OpenAPI documentation for Yuki DB API endpoints
 * 
 * @param options Configuration options
 * @param options.schema Database schema definition
 * @param options.customRoutes Custom API routes configuration
 * @param options.info API information
 * @param options.servers API server configurations
 * @returns Complete OpenAPI specification object
 * 
 * @example
 * ```typescript
 * import { generateOpenAPISpec } from 'yuki-db/openapi'
 * import * as schema from './schema'
 * 
 * const apiSpec = generateOpenAPISpec({
 *   schema,
 *   customRoutes: {
 *     'users/stats': { GET: true },
 *     'posts/popular': { GET: true }
 *   },
 *   info: {
 *     title: 'My API',
 *     version: '1.0.0',
 *     description: 'Database API powered by Yuki DB'
 *   },
 *   servers: [{ url: 'http://localhost:3000', description: 'Development' }]
 * })
 * ```
 */
export function generateOpenAPISpec(options: {
    schema: Record<string, any>
    customRoutes?: Record<string, Record<string, boolean>>
    info?: {
        title?: string
        version?: string
        description?: string
    }
    servers?: Array<{ url: string; description: string }>
    excludedTables?: string[]
}): OpenAPISchema {
    const { schema, customRoutes = {}, info = {}, servers = [], excludedTables = [] } = options

    const spec: OpenAPISchema = {
        openapi: '3.0.3',
        info: {
            title: info.title || 'Yuki DB API',
            version: info.version || '1.0.0',
            description: info.description || 'Auto-generated API documentation for Yuki DB endpoints'
        },
        servers,
        paths: {},
        components: {
            schemas: {
                ApiResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            description: 'Indicates if the request was successful'
                        },
                        data: {
                            type: 'object',
                            description: 'Response data payload'
                        },
                        error: {
                            type: 'string',
                            description: 'Error message if request failed'
                        },
                        message: {
                            type: 'string',
                            description: 'Human-readable response message'
                        },
                        meta: {
                            type: 'object',
                            description: 'Additional metadata for pagination and query info',
                            properties: {
                                total: {
                                    type: 'number',
                                    description: 'Total number of records'
                                },
                                page: {
                                    type: 'number',
                                    description: 'Current page number'
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum records per page'
                                },
                                offset: {
                                    type: 'number',
                                    description: 'Number of records skipped'
                                }
                            }
                        }
                    },
                    required: ['success']
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false,
                            description: 'Always false for error responses'
                        },
                        error: {
                            type: 'string',
                            description: 'Error message describing what went wrong'
                        },
                        message: {
                            type: 'string',
                            description: 'Additional context about the error'
                        }
                    },
                    required: ['success', 'error']
                }
            },
            responses: {
                BadRequest: {
                    description: 'Bad Request - Invalid parameters or malformed request',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: {
                                success: false,
                                error: 'Missing required parameters: select and from are required'
                            }
                        }
                    }
                },
                InternalError: {
                    description: 'Internal Server Error - Database or server error',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: {
                                success: false,
                                error: 'Internal server error during query execution'
                            }
                        }
                    }
                }
            }
        }
    }

    // Helper to prefix all paths
    const apiPrefix = '/api/v1';

    // Generate schemas for each table (skip excluded)
    for (const [tableName, tableSchema] of Object.entries(schema)) {
        if (excludedTables.includes(tableName)) continue;
        const properties: Record<string, any> = {}
        const required: string[] = []

        for (const [fieldName, fieldDefRaw] of Object.entries(tableSchema)) {
            if (fieldName === 'enableRLS') continue; // Explicitly exclude enableRLS from OpenAPI schema
            const fieldDef = fieldDefRaw as any;
            // Tentative d'inférence du type à partir de Drizzle
            let type = 'string'
            let format: string | undefined = undefined
            // Drizzle expose souvent .dataType ou .columnType
            const dataType = fieldDef.dataType || fieldDef.columnType || fieldDef.type || ''
            if (typeof dataType === 'string' && (dataType.includes('int') || dataType === 'number')) type = 'number'
            else if (dataType === 'boolean') type = 'boolean'
            else if (dataType === 'date' || dataType === 'timestamp') {
                type = 'string'; format = 'date-time'
            }
            // Ajoute description si dispo
            const description = fieldDef.description || `${fieldName} field of ${tableName} table`
            // Détecte notNull
            if (fieldDef.notNull || (typeof fieldDef.isNullable === 'function' && !fieldDef.isNullable())) {
                required.push(fieldName)
            }
            properties[fieldName] = format
                ? { type, format, description }
                : { type, description }
        }

    spec.components.schemas[tableName] = {
            type: 'object',
            properties,
            required,
            description: `${tableName} table schema`
        }

    spec.components.schemas[`${tableName}Input`] = {
            type: 'object',
            properties,
            required,
            description: `Input schema for creating/updating ${tableName} records`
        }
    }

    // Generate paths for each table with new URL structure (skip excluded)
    for (const [tableName] of Object.entries(schema)) {
        if (excludedTables.includes(tableName)) continue;
        // GET by id path
        spec.paths[`${apiPrefix}/${tableName}/{id}`] = {
            get: {
                summary: `Get a single ${tableName} record by id`,
                description: `Retrieve a single record from the ${tableName} table by id`,
                tags: [tableName],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                        description: 'The id of the record to retrieve',
                        example: '1'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Single record found',
                        content: {
                            'application/json': {
                                schema: {
                                    allOf: [
                                        { $ref: '#/components/schemas/ApiResponse' },
                                        {
                                            properties: {
                                                data: { $ref: `#/components/schemas/${tableName}` }
                                            }
                                        }
                                    ]
                                },
                                example: {
                                    success: true,
                                    data: (() => {
                                        const record: Record<string, any> = {};
                                        for (const [fieldName, fieldDefRaw] of Object.entries(schema[tableName])) {
                                            if (fieldName === 'enableRLS') continue;
                                            const fieldDef = fieldDefRaw as any;
                                            let value: any = 'string';
                                            const dataType = fieldDef.dataType || fieldDef.columnType || fieldDef.type || '';
                                            if (typeof dataType === 'string' && (dataType.includes('int') || dataType === 'number')) {
                                                value = 1;
                                            } else if (dataType === 'boolean') {
                                                value = true;
                                            } else if (dataType === 'date' || dataType === 'timestamp') {
                                                value = '2025-08-15T10:30:00Z';
                                            } else if (fieldName.toLowerCase().includes('email')) {
                                                value = 'john@example.com';
                                            } else if (fieldName.toLowerCase().includes('name')) {
                                                value = 'John Doe';
                                            } else if (fieldName.toLowerCase().includes('title')) {
                                                value = 'My Post Title';
                                            } else if (fieldName.toLowerCase().includes('content')) {
                                                value = 'This is the post content.';
                                            }
                                            record[fieldName] = value;
                                        }
                                        return record;
                                    })(),
                                    message: `Successfully retrieved 1 record from ${tableName}`
                                }
                            }
                        }
                    },
                    '404': {
                        description: 'Record not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ApiResponse' },
                                example: {
                                    success: false,
                                    error: 'Record not found'
                                }
                            }
                        }
                    },
                    '400': { $ref: '#/components/responses/BadRequest' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            }
        };
        // Generate a dynamic example for POST (exclude auto-generated/default fields)
        const buildExamplePayload = () => {
            const example: Record<string, any> = {};
            for (const [fieldName, fieldDefRaw] of Object.entries(schema[tableName])) {
                if (fieldName === 'enableRLS') continue; // Exclude enableRLS from example payloads
                const fieldDef = fieldDefRaw as any;
                // Exclude auto fields: id, createdAt, updatedAt, enableRLS, and fields with defaultNow/defaultRandom/hasDefault
                const isAuto =
                    fieldName === 'id' ||
                    fieldName === 'createdAt' ||
                    fieldName === 'updatedAt' ||
                    fieldDef.defaultNow ||
                    fieldDef.defaultRandom ||
                    fieldDef.hasDefault;
                if (isAuto) continue;
                let type = 'string';
                let value: any = 'string';
                const dataType = fieldDef.dataType || fieldDef.columnType || fieldDef.type || '';
                if (typeof dataType === 'string' && (dataType.includes('int') || dataType === 'number')) {
                    type = 'number';
                    value = 123;
                } else if (dataType === 'boolean') {
                    type = 'boolean';
                    value = true;
                } else if (dataType === 'date' || dataType === 'timestamp') {
                    type = 'string';
                    value = '2025-08-15T10:30:00Z';
                } else if (fieldName.toLowerCase().includes('email')) {
                    value = 'john@example.com';
                } else if (fieldName.toLowerCase().includes('name')) {
                    value = 'John Doe';
                } else if (fieldName.toLowerCase().includes('title')) {
                    value = 'My Post Title';
                } else if (fieldName.toLowerCase().includes('content')) {
                    value = 'This is the post content.';
                }
                example[fieldName] = value;
            }
            return example;
        };
        const examplePayload = buildExamplePayload();
    spec.paths[`${apiPrefix}/${tableName}`] = {
            delete: {
                summary: `Delete ${tableName} records`,
                description: `Delete records from ${tableName} table matching WHERE conditions (WHERE clause required for safety)`,
                tags: [tableName],
                parameters: [
                    {
                        name: 'where',
                        in: 'query',
                        required: true,
                        schema: { type: 'string' },
                        description: 'JSON string with delete conditions (required for safety)',
                        example: '{"id":{"eq":1}}'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Record(s) deleted successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    allOf: [
                                        { $ref: '#/components/schemas/ApiResponse' },
                                        {
                                            properties: {
                                                data: {
                                                    type: 'array',
                                                    items: { $ref: `#/components/schemas/${tableName}` }
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    '400': { $ref: '#/components/responses/BadRequest' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            },
            get: {
                summary: `Query ${tableName} records`,
                tags: [tableName],
                parameters: [
                    {
                        name: 'select',
                        in: 'query',
                        schema: { type: 'string' },
                        description: 'Comma-separated list of fields to select (use * for all, default: all fields)',
                        example: 'id,name,email'
                    },
                    {
                        name: 'where',
                        in: 'query',
                        schema: { type: 'string' },
                        description: 'JSON string with filter conditions',
                        example: '{"age":{"gte":18},"status":{"eq":"active"}}'
                    },
                    {
                        name: 'orderBy',
                        in: 'query',
                        schema: { type: 'string' },
                        description: 'JSON object with sorting rules',
                        example: '{"createdAt":"desc","name":"asc"}'
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        schema: { type: 'integer', minimum: 1, maximum: 1000 },
                        description: 'Maximum number of records to return (default: 100)'
                    },
                    {
                        name: 'offset',
                        in: 'query',
                        schema: { type: 'integer', minimum: 0 },
                        description: 'Number of records to skip'
                    },
                    {
                        name: 'page',
                        in: 'query',
                        schema: { type: 'integer', minimum: 1 },
                        description: 'Page number (alternative to offset)'
                    }
                ],
                responses: {
                    '200': {
                        description: 'Successful query with results',
                        content: {
                            'application/json': {
                                schema: {
                                    allOf: [
                                        { $ref: '#/components/schemas/ApiResponse' },
                                        {
                                            properties: {
                                                data: {
                                                    type: 'array',
                                                    items: { $ref: `#/components/schemas/${tableName}` },
                                                    description: `Array of ${tableName} records`
                                                },
                                                meta: {
                                                    type: 'object',
                                                    properties: {
                                                        total: { type: 'number' },
                                                        page: { type: 'number' },
                                                        limit: { type: 'number' },
                                                        offset: { type: 'number' }
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                },
                                example: (() => {
                                    // Build a generic GET example for any table
                                    const buildRecord = (i: number) => {
                                        const record: Record<string, any> = {};
                                        for (const [fieldName, fieldDefRaw] of Object.entries(schema[tableName])) {
                                            if (fieldName === 'enableRLS') continue;
                                            const fieldDef = fieldDefRaw as any;
                                            let value: any = 'string';
                                            const dataType = fieldDef.dataType || fieldDef.columnType || fieldDef.type || '';
                                            if (typeof dataType === 'string' && (dataType.includes('int') || dataType === 'number')) {
                                                value = i;
                                            } else if (dataType === 'boolean') {
                                                value = i % 2 === 0;
                                            } else if (dataType === 'date' || dataType === 'timestamp') {
                                                value = `2025-08-15T10:3${i}:00Z`;
                                            } else if (fieldName.toLowerCase().includes('email')) {
                                                value = i === 1 ? 'john@example.com' : 'jane@example.com';
                                            } else if (fieldName.toLowerCase().includes('name')) {
                                                value = i === 1 ? 'John Doe' : 'Jane Smith';
                                            } else if (fieldName.toLowerCase().includes('title')) {
                                                value = i === 1 ? 'My Post Title' : 'Another Post';
                                            } else if (fieldName.toLowerCase().includes('content')) {
                                                value = i === 1 ? 'This is the post content.' : 'Second post content.';
                                            }
                                            record[fieldName] = value;
                                        }
                                        return record;
                                    };
                                    return {
                                        success: true,
                                        data: [buildRecord(1), buildRecord(2)],
                                        message: `Successfully retrieved 2 records from ${tableName}`,
                                        meta: {
                                            total: 2,
                                            page: 1,
                                            limit: 100,
                                            offset: 0
                                        }
                                    };
                                })()
                            }
                        }
                    },
                    '400': { $ref: '#/components/responses/BadRequest' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            },
            post: {
                summary: `Create new ${tableName} record(s)`,
                description: `Insert one or more records into the ${tableName} table with validation`,
                tags: [tableName],
                requestBody: {
                    required: true,
                    description: 'Record data to insert (single object or array of objects)',
                    content: {
                        'application/json': {
                            schema: {
                                oneOf: [
                                    { $ref: `#/components/schemas/${tableName}Input` },
                                    { type: 'array', items: { $ref: `#/components/schemas/${tableName}Input` } }
                                ]
                            },
                            example: examplePayload
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Record(s) created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    allOf: [
                                        { $ref: '#/components/schemas/ApiResponse' },
                                        {
                                            properties: {
                                                data: {
                                                    type: 'array',
                                                    items: { $ref: `#/components/schemas/${tableName}` }
                                                }
                                            }
                                        }
                                    ]
                                },
                                example: {
                                    success: true,
                                    data: [
                                        (() => {
                                            // Build a response example matching the schema, including auto fields, but exclude enableRLS
                                            const record: Record<string, any> = {};
                                            for (const [fieldName, fieldDefRaw] of Object.entries(schema[tableName])) {
                                                if (fieldName === 'enableRLS') continue;
                                                const fieldDef = fieldDefRaw as any;
                                                let type = 'string';
                                                let value: any = 'string';
                                                const dataType = fieldDef.dataType || fieldDef.columnType || fieldDef.type || '';
                                                if (typeof dataType === 'string' && (dataType.includes('int') || dataType === 'number')) {
                                                    type = 'number';
                                                    value = 1;
                                                } else if (dataType === 'boolean') {
                                                    type = 'boolean';
                                                    value = true;
                                                } else if (dataType === 'date' || dataType === 'timestamp') {
                                                    type = 'string';
                                                    value = '2025-08-15T10:30:00Z';
                                                } else if (fieldName.toLowerCase().includes('email')) {
                                                    value = 'john@example.com';
                                                } else if (fieldName.toLowerCase().includes('name')) {
                                                    value = 'John Doe';
                                                } else if (fieldName.toLowerCase().includes('title')) {
                                                    value = 'My Post Title';
                                                } else if (fieldName.toLowerCase().includes('content')) {
                                                    value = 'This is the post content.';
                                                }
                                                record[fieldName] = value;
                                            }
                                            return record;
                                        })()
                                    ],
                                    message: `Successfully inserted 1 record(s) into ${tableName}`
                                }
                            }
                        }
                    },
                    '400': { $ref: '#/components/responses/BadRequest' },
                    '500': { $ref: '#/components/responses/InternalError' }
                }
            },
            put: {
                summary: `Update ${tableName} records`,
                description: `Update existing records in ${tableName} table matching WHERE conditions`,
                tags: [tableName],
                        parameters: [
                            {
                                name: 'where',
                                in: 'query',
                                required: true,
                                schema: { type: 'string' },
                                description: 'Update condition: must be a JSON string specifying only the id, e.g. {"id":1}',
                                example: '{"id":1}'
                            }
                        ],
                requestBody: {
                    required: true,
                    description: 'Fields to update with new values',
                    content: {
                        'application/json': {
                            schema: { $ref: `#/components/schemas/${tableName}Input` },
                            example: (() => {
                                const example: Record<string, any> = {};
                                for (const [fieldName, fieldDefRaw] of Object.entries(schema[tableName])) {
                                    if (['id', 'createdAt', 'updatedAt', 'enableRLS'].includes(fieldName)) continue;
                                    const fieldDef = fieldDefRaw as any;
                                    let value: any = 'string';
                                    const dataType = fieldDef.dataType || fieldDef.columnType || fieldDef.type || '';
                                    if (typeof dataType === 'string' && (dataType.includes('int') || dataType === 'number')) {
                                        value = 2;
                                    } else if (dataType === 'boolean') {
                                        value = false;
                                    } else if (dataType === 'date' || dataType === 'timestamp') {
                                        value = '2025-08-15T10:35:00Z';
                                    } else if (fieldName.toLowerCase().includes('email')) {
                                        value = 'jane.doe@example.com';
                                    } else if (fieldName.toLowerCase().includes('name')) {
                                        value = 'Jane Doe';
                                    } else if (fieldName.toLowerCase().includes('title')) {
                                        value = 'Updated Post Title';
                                    } else if (fieldName.toLowerCase().includes('content')) {
                                        value = 'This is the updated post content.';
                                    }
                                    example[fieldName] = value;
                                }
                                return example;
                            })()
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Record(s) updated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    allOf: [
                                        { $ref: '#/components/schemas/ApiResponse' },
                                        {
                                            properties: {
                                                data: {
                                                    type: 'array',
                                                    items: { $ref: `#/components/schemas/${tableName}` }
                                                }
                                            }
                                        }
                                    ]
                                },
                                example: {
                                    success: true,
                                    data: [
                                        (() => {
                                            const record: Record<string, any> = {};
                                            for (const [fieldName, fieldDefRaw] of Object.entries(schema[tableName])) {
                                                if (fieldName === 'enableRLS') continue;
                                                const fieldDef = fieldDefRaw as any;
                                                let value: any = 'string';
                                                const dataType = fieldDef.dataType || fieldDef.columnType || fieldDef.type || '';
                                                if (typeof dataType === 'string' && (dataType.includes('int') || dataType === 'number')) {
                                                    value = 1;
                                                } else if (dataType === 'boolean') {
                                                    value = false;
                                                } else if (dataType === 'date' || dataType === 'timestamp') {
                                                    value = '2025-08-15T10:35:00Z';
                                                } else if (fieldName.toLowerCase().includes('email')) {
                                                    value = 'jane.doe@example.com';
                                                } else if (fieldName.toLowerCase().includes('name')) {
                                                    value = 'Jane Doe';
                                                } else if (fieldName.toLowerCase().includes('title')) {
                                                    value = 'Updated Post Title';
                                                } else if (fieldName.toLowerCase().includes('content')) {
                                                    value = 'This is the updated post content.';
                                                }
                                                record[fieldName] = value;
                                            }
                                            return record;
                                        })()
                                    ],
                                    message: `Successfully updated 1 record(s) in ${tableName}`
                                }
                            }
                        }
                    },
                    '400': { $ref: '#/components/responses/BadRequest' },
                    '500': { $ref: '#/components/responses/InternalError' }
                },
                patch: {
                    summary: `Partially update ${tableName} records`,
                    description: `Alias for PUT - partially update existing records in ${tableName} table matching WHERE conditions`,
                    tags: [tableName],
                                parameters: [
                                    {
                                        name: 'where',
                                        in: 'query',
                                        required: true,
                                        schema: { type: 'string' },
                                        description: 'Update condition: must be a JSON string specifying only the id, e.g. {"id":1}',
                                        example: '{"id":1}'
                                    }
                                ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: `#/components/schemas/${tableName}Input` },
                                example: (() => {
                                    // Build a realistic patch example (exclude id, createdAt, updatedAt, enableRLS)
                                    const example: Record<string, any> = {};
                                    for (const [fieldName, fieldDefRaw] of Object.entries(schema[tableName])) {
                                        if (['id', 'createdAt', 'updatedAt', 'enableRLS'].includes(fieldName)) continue;
                                        const fieldDef = fieldDefRaw as any;
                                        let value: any = 'string';
                                        const dataType = fieldDef.dataType || fieldDef.columnType || fieldDef.type || '';
                                        if (typeof dataType === 'string' && (dataType.includes('int') || dataType === 'number')) {
                                            value = 2;
                                        } else if (dataType === 'boolean') {
                                            value = false;
                                        } else if (dataType === 'date' || dataType === 'timestamp') {
                                            value = '2025-08-15T10:35:00Z';
                                        } else if (fieldName.toLowerCase().includes('email')) {
                                            value = 'jane.doe@example.com';
                                        } else if (fieldName.toLowerCase().includes('name')) {
                                            value = 'Jane Doe';
                                        } else if (fieldName.toLowerCase().includes('title')) {
                                            value = 'Updated Post Title';
                                        } else if (fieldName.toLowerCase().includes('content')) {
                                            value = 'This is the updated post content.';
                                        }
                                        example[fieldName] = value;
                                    }
                                    return example;
                                })()
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Record(s) updated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: `#/components/schemas/${tableName}` }
                                                    }
                                                }
                                            }
                                        ]
                                    },
                                    example: {
                                        success: true,
                                        data: [
                                            (() => {
                                                // Build a response example matching the schema, including auto fields, but exclude enableRLS
                                                const record: Record<string, any> = {};
                                                for (const [fieldName, fieldDefRaw] of Object.entries(schema[tableName])) {
                                                    if (fieldName === 'enableRLS') continue;
                                                    const fieldDef = fieldDefRaw as any;
                                                    let value: any = 'string';
                                                    const dataType = fieldDef.dataType || fieldDef.columnType || fieldDef.type || '';
                                                    if (typeof dataType === 'string' && (dataType.includes('int') || dataType === 'number')) {
                                                        value = 1;
                                                    } else if (dataType === 'boolean') {
                                                        value = false;
                                                    } else if (dataType === 'date' || dataType === 'timestamp') {
                                                        value = '2025-08-15T10:35:00Z';
                                                    } else if (fieldName.toLowerCase().includes('email')) {
                                                        value = 'jane.doe@example.com';
                                                    } else if (fieldName.toLowerCase().includes('name')) {
                                                        value = 'Jane Doe';
                                                    } else if (fieldName.toLowerCase().includes('title')) {
                                                        value = 'Updated Post Title';
                                                    } else if (fieldName.toLowerCase().includes('content')) {
                                                        value = 'This is the updated post content.';
                                                    }
                                                    record[fieldName] = value;
                                                }
                                                return record;
                                            })()
                                        ],
                                        message: `Successfully updated 1 record(s) in ${tableName}`
                                    }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                },
                delete: {
                    summary: `Delete ${tableName} records`,
                    description: `Delete records from ${tableName} table matching WHERE conditions (WHERE clause required for safety)`,
                    tags: [tableName],
                                parameters: [
                                    {
                                        name: 'where',
                                        in: 'query',
                                        required: true,
                                        schema: { type: 'string' },
                                        description: 'Delete condition: must be a JSON string specifying only the id, e.g. {"id":1}',
                                        example: '{"id":1}'
                                    }
                                ],
                    responses: {
                        '200': {
                            description: 'Record(s) deleted successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/ApiResponse' },
                                            {
                                                properties: {
                                                    data: {
                                                        type: 'array',
                                                        items: { $ref: `#/components/schemas/${tableName}` }
                                                    }
                                                }
                                            }
                                        ]
                                    },
                                    example: {
                                        success: true,
                                        data: [
                                            { id: 1, name: 'John Doe', email: 'john@example.com' }
                                        ],
                                        message: `Successfully deleted 1 record(s) from ${tableName}`
                                    }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }
            }
        }
    }

    // Generate paths for custom routes
    for (const [routePath, methods] of Object.entries(customRoutes)) {
        const pathKey = `${apiPrefix}/${routePath}`;

        if (!spec.paths[pathKey]) {
            spec.paths[pathKey] = {}
        }

        // Extract table name and action from route
        const [tableName, action] = routePath.split('/')
        const isTableRoute = schema[tableName]

        for (const [method, enabled] of Object.entries(methods)) {
            if (enabled) {
                const methodLower = method.toLowerCase()

                spec.paths[pathKey][methodLower] = {
                    summary: `${action ? action.charAt(0).toUpperCase() + action.slice(1) : 'Custom'} ${isTableRoute ? tableName : 'endpoint'}`,
                    description: `Custom ${method} endpoint for ${routePath}`,
                    tags: [isTableRoute ? tableName : 'Custom'],
                    responses: {
                        '200': {
                            description: 'Successful response',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/ApiResponse' }
                                }
                            }
                        },
                        '400': { $ref: '#/components/responses/BadRequest' },
                        '500': { $ref: '#/components/responses/InternalError' }
                    }
                }

                // Add request body for POST/PUT/PATCH methods
                if (['post', 'put', 'patch'].includes(methodLower)) {
                    spec.paths[pathKey][methodLower].requestBody = {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    additionalProperties: true,
                                    description: 'Request payload for custom endpoint'
                                }
                            }
                        }
                    }
                }

                // Add query parameters hint
                if (methodLower === 'get') {
                    spec.paths[pathKey][methodLower].parameters = [
                        {
                            name: 'q',
                            in: 'query',
                            schema: { type: 'string' },
                            description: 'Query parameter (varies by endpoint)',
                            required: false
                        }
                    ]
                }
            }
        }
    }

    return spec
}

/**
 * Creates a GET endpoint that serves the OpenAPI specification
 * Useful for integrating with Swagger UI or other API documentation tools
 * 
 * @param schema Database schema definition
 * @param options Configuration options for API info, servers, and custom routes
 * @returns Object with GET handler that serves OpenAPI spec
 * 
 * @example
 * ```typescript
 * import { createOpenAPIHandler } from 'yuki-db/openapi'
 * import * as schema from './schema'
 * 
 * // Serve OpenAPI spec at /api/docs
 * export const { GET } = createOpenAPIHandler(schema, {
 *   info: { title: 'My API', version: '1.0.0' },
 *   servers: [{ url: 'http://localhost:3000', description: 'Development' }],
 *   customRoutes: {
 *     'users/stats': { GET: true },
 *     'posts/popular': { GET: true }
 *   }
 * })
 * ```
 */
export function createOpenAPIHandler(schema: Record<string, any>, options?: {
    info?: { title?: string; version?: string; description?: string }
    servers?: Array<{ url: string; description: string }>
    customRoutes?: Record<string, Record<string, boolean>>
}) {
    const spec = generateOpenAPISpec({ schema, ...options })

    return {
        GET: async (): Promise<Response> => {
            return Response.json(spec, {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            })
        }
    }
}

/**
 * Creates a Swagger UI handler that serves interactive API documentation
 * 
 * @param specUrl URL where the OpenAPI spec is served
 * @param options Configuration options for Swagger UI
 * @returns Object with GET handler that serves Swagger UI HTML
 * 
 * @example
 * ```typescript
 * import { createSwaggerUIHandler } from 'yuki-db/openapi'
 * 
 * // Serve Swagger UI at /api/swagger
 * export const { GET } = createSwaggerUIHandler('/api/docs', {
 *   title: 'My API Documentation'
 * })
 * ```
 */
// Correction : Swagger UI handler renvoie une page HTML complète avec StandaloneLayout.
// Utilisation dans Hono :
// app.get('/docs', () => swaggerGET())
// app.get('/openapi.json', () => openapiGET())
export function createSwaggerUIHandler(specUrl: string, options?: {
    title?: string
    customCss?: string
}) {
    const title = options?.title || 'API Documentation'
    const customCss = options?.customCss || ''

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="SwaggerUI" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui.css" />
  <style>
    ${customCss}
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .scheme-container { background: none; box-shadow: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout",
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: true
      });
    };
  </script>
</body>
</html>`

    return {
        GET: async (): Promise<Response> => {
            return new Response(html, {
                headers: {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'public, max-age=3600'
                }
            })
        }
    }
}

export type { OpenAPISchema }
