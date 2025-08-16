import type { AnyColumn, SQL, SQLWrapper } from 'drizzle-orm'
import {
    and,
    asc,
    desc,
    eq,
    gt,
    gte,
    ilike,
    lt,
    lte,
    not,
    or,
} from 'drizzle-orm'

import type { Database } from '../types'

interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
    message?: string
    meta?: {
        total?: number
        page?: number
        limit?: number
        offset?: number
    }
}

interface QueryParams {
    select?: string[]
    where?: Record<string, any>
    orderBy?: Record<string, 'asc' | 'desc'>
    limit?: number
    page?: number
    offset?: number
}

interface MutationParams {
    where?: Record<string, any>
    data?: Record<string, any>
}

/**
 * Creates HTTP handlers for database operations with automatic REST API generation
 * 
 * Simple and clean API - just provide your database and schema!
 * Automatically generates REST endpoints like GET/POST/PUT/DELETE /{tableName}
 * 
 * @param config Database configuration with db instance and schema
 * @returns Object with HTTP method handlers (GET, POST, PUT, PATCH, DELETE)
 * 
 * @example
 * ```typescript
 * import { createHandler } from 'yuki-db/drizzle'
 * import { db } from './db'
 * import * as schema from './schema'
 * 
 * // Simple setup - no complex configuration needed!
 * export const { GET, POST, PUT, PATCH, DELETE } = createHandler({ db, schema })
 * 
 * // That's it! Now you have:
 * // GET /users - get all users
 * // POST /users - create user(s)
 * // PUT /users?where={"id":{"eq":1}} - update user
 * // DELETE /users?where={"id":{"eq":1}} - delete user
 * ```
 */
export function createHandler<TDatabase extends Database>(config: TDatabase): {
    GET: (request: Request) => Promise<Response>
    GET_BY_ID: (request: Request) => Promise<Response>
    POST: (request: Request) => Promise<Response>
    PUT: (request: Request) => Promise<Response>
    PATCH: (request: Request) => Promise<Response>
    DELETE: (request: Request) => Promise<Response>

} {
    const db = (config as unknown as { db: any }).db
    const schema = (config as unknown as { schema: any }).schema

    /**
     * Extracts table name from URL path
     * Supports patterns like /api/users, /users, /posts
     */
    function extractTableFromUrl(url: string): string | null {
        try {
            const urlObj = new URL(url)
            const pathParts = urlObj.pathname.split('/').filter(Boolean)

            // Remove 'api' prefix if present
            if (pathParts[0] === 'api') {
                pathParts.shift()
            }

            // Get the table name (first remaining part)
            return pathParts[0] || null
        } catch {
            return null
        }
    }

    /**
     * Builds WHERE conditions from query parameters
     */
    function buildWhereCondition(whereObj: Record<string, any>, tableSchema: any): SQL | undefined {
        if (!whereObj || typeof whereObj !== 'object') return undefined

        const conditions: (SQL | SQLWrapper)[] = []

        // Helper function to convert object to array of entries (ES5 compatible)
        function objectToEntries(obj: Record<string, any>): [string, any][] {
            const entries: [string, any][] = []
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    entries.push([key, obj[key]])
                }
            }
            return entries
        }

        // Process logical operators
        if (whereObj.AND && Array.isArray(whereObj.AND)) {
            const andConditions = whereObj.AND
                .map((condition: Record<string, any>) => buildWhereCondition(condition, tableSchema))
                .filter((c) => c !== undefined);
            //@ts-ignore
            const onlyDefinedAnd = andConditions.filter((c): c is SQL | SQLWrapper => c !== undefined);
            if (onlyDefinedAnd.length > 0) {
                //@ts-ignore
                conditions.push(and(...onlyDefinedAnd));
            }
        }

        if (whereObj.OR && Array.isArray(whereObj.OR)) {
            const orConditions = whereObj.OR
                .map((condition: Record<string, any>) => buildWhereCondition(condition, tableSchema))
                .filter((c) => c !== undefined);
            //@ts-ignore
            const onlyDefinedOr = orConditions.filter((c): c is SQL | SQLWrapper => c !== undefined);
            if (onlyDefinedOr.length > 0) {
                //@ts-ignore
                conditions.push(or(...onlyDefinedOr));
            }
        }

        if (whereObj.NOT) {
            const notCondition = buildWhereCondition(whereObj.NOT, tableSchema)
            if (notCondition) {
                conditions.push(not(notCondition))
            }
        }

        // Process field conditions
        for (const [key, value] of objectToEntries(whereObj)) {
            if (['AND', 'OR', 'NOT'].indexOf(key) !== -1) continue

            const column = tableSchema[key] as AnyColumn
            if (!column) continue

            if (typeof value === 'object' && value !== null) {
                const fieldConditions = objectToEntries(value)
                    .map(([operator, operatorValue]) => {
                        switch (operator) {
                            case 'eq': return eq(column, operatorValue);
                            case 'ne': return not(eq(column, operatorValue));
                            case 'gt': return gt(column, operatorValue);
                            case 'gte': return gte(column, operatorValue);
                            case 'lt': return lt(column, operatorValue);
                            case 'lte': return lte(column, operatorValue);
                            case 'like': return ilike(column, operatorValue);
                            case 'ilike': return ilike(column, operatorValue);
                            default: return undefined;
                        }
                    })
                    .filter((c) => c !== undefined);
                //@ts-ignore
                const onlyDefinedFields = fieldConditions.filter((c): c is SQL | SQLWrapper => c !== undefined);
                if (onlyDefinedFields.length > 0) {
                    //@ts-ignore
                    conditions.push(and(...onlyDefinedFields));
                }
            } else {
                // Direct value comparison (shorthand for eq)
                conditions.push(eq(column, value))
            }
        }

        return conditions.length > 0 ? and(...conditions) : undefined
    }

    /**
     * Validates if a table exists in schema
     */
    function validateTable(tableName: string): boolean {
        return tableName in schema
    }

    /**
     * Validates if fields exist in table schema
     */
    function validateFields(tableName: string, fields: string[]): string[] {
        const tableSchema = schema[tableName]
        if (!tableSchema) return []

        return fields.filter(field => {
            if (field === '*') return true
            return field in tableSchema
        })
    }

    /**
     * Parses query parameters from URL
     */
    function parseQueryParams(url: string): QueryParams {
        const urlObj = new URL(url)
        const params: QueryParams = {}

        const select = urlObj.searchParams.get('select')
        if (select) {
            params.select = select.split(',').map(s => s.trim())
        }

        const where = urlObj.searchParams.get('where')
        if (where) {
            try {
                params.where = JSON.parse(where)
            } catch {
                // Invalid JSON, ignore
            }
        }

        const orderBy = urlObj.searchParams.get('orderBy')
        if (orderBy) {
            try {
                params.orderBy = JSON.parse(orderBy)
            } catch {
                // Invalid JSON, ignore
            }
        }

        const limit = urlObj.searchParams.get('limit')
        if (limit) {
            const numLimit = parseInt(limit, 10)
            if (!isNaN(numLimit) && numLimit > 0) {
                params.limit = numLimit
            }
        }

        const page = urlObj.searchParams.get('page')
        if (page) {
            const numPage = parseInt(page, 10)
            if (!isNaN(numPage) && numPage > 0) {
                params.page = numPage
            }
        }

        const offset = urlObj.searchParams.get('offset')
        if (offset) {
            const numOffset = parseInt(offset, 10)
            if (!isNaN(numOffset) && numOffset >= 0) {
                params.offset = numOffset
            }
        }

        return params
    }

    return {
        /**
         * GET /{tableName} - Read records
         * Supports: ?select=field1,field2&where={...}&orderBy={...}&limit=10&page=1
         */
        GET: (request: Request): Promise<Response> => {
            return new Promise((resolve) => {
                try {
                    const tableName = extractTableFromUrl(request.url)

                    if (!tableName) {
                        resolve(Response.json({
                            success: false,
                            error: 'Table name is required in URL path'
                        }, { status: 400 }))
                        return
                    }

                    if (!validateTable(tableName)) {
                        resolve(Response.json({
                            success: false,
                            error: `Table "${tableName}" not found`
                        }, { status: 404 }))
                        return
                    }

                    const tableSchema = schema[tableName]
                    const params = parseQueryParams(request.url)

                    // Build query
                    let query = db.select()

                    // Handle field selection
                    if (params.select && params.select.length > 0) {
                        const validFields = validateFields(tableName, params.select)
                        if (validFields.length === 0) {
                            resolve(Response.json({
                                success: false,
                                error: 'No valid fields specified for selection'
                            }, { status: 400 }))
                            return
                        }

                        // Check if we want all fields or specific ones
                        const selectFields = validFields.indexOf('*') !== -1
                            ? undefined // Select all fields
                            : validFields.reduce<Record<string, AnyColumn>>((acc, field) => {
                                if (Object.prototype.hasOwnProperty.call(tableSchema, field)) {
                                    acc[field] = tableSchema[field] as AnyColumn
                                }
                                return acc
                            }, {})

                        if (selectFields) {
                            query = db.select(selectFields)
                        }
                    }

                    query = query.from(tableSchema)


                    // Add WHERE conditions
                    if (params.where) {
                        const whereCondition = buildWhereCondition(params.where, tableSchema)
                        if (whereCondition) {
                            query = query.where(whereCondition)
                        }
                    }

                    // Add ORDER BY
                    if (params.orderBy) {
                        const orderConditions: (SQL | SQLWrapper)[] = []
                        for (const key in params.orderBy) {
                            if (params.orderBy.hasOwnProperty(key)) {
                                const direction = params.orderBy[key]
                                const validFields = validateFields(tableName, [key])
                                if (validFields.length === 0) {
                                    resolve(Response.json({
                                        success: false,
                                        error: `Invalid field "${key}" in orderBy`
                                    }, { status: 400 }))
                                    return
                                }

                                if (direction !== 'asc' && direction !== 'desc') {
                                    resolve(Response.json({
                                        success: false,
                                        error: `Invalid direction "${direction}" for field "${key}". Use "asc" or "desc"`
                                    }, { status: 400 }))
                                    return
                                }

                                const column = tableSchema[key]
                                orderConditions.push(direction === 'desc' ? desc(column) : asc(column))
                            }
                        }
                        if (orderConditions.length > 0) {
                            query = query.orderBy(...orderConditions)
                        }
                    }

                    // Add pagination
                    if (params.limit) {
                        query = query.limit(params.limit)
                    }

                    if (params.offset) {
                        query = query.offset(params.offset)
                    } else if (params.page && params.limit) {
                        query = query.offset((params.page - 1) * params.limit)
                    }

                    // Execute query
                    query.then((result: any[]) => {
                        const response: ApiResponse = {
                            success: true,
                            data: result,
                            meta: {
                                total: result.length,
                                ...(params.page && { page: params.page }),
                                ...(params.limit && { limit: params.limit })
                            }
                        }
                        resolve(Response.json(response))
                    }).catch((error: any) => {
                        console.error('Database query error:', error)
                        resolve(Response.json({
                            success: false,
                            error: 'Database query failed',
                            message: error.message
                        }, { status: 500 }))
                    })

                } catch (error: any) {
                    console.error('GET handler error:', error)
                    resolve(Response.json({
                        success: false,
                        error: 'Internal server error',
                        message: error.message
                    }, { status: 500 }))
                }
            })
        },

        /**
               * GET /{tableName}/{id} - Get single record by id
               * Only supports id as path param, no query params
               */
        GET_BY_ID: (request: Request): Promise<Response> => {
            return new Promise((resolve) => {
                try {
                    const urlObj = new URL(request.url);
                    const pathParts = urlObj.pathname.split('/').filter(Boolean);
                    let tableName: string | null = null;
                    let id: string | null = null;
                    // Remove 'api' prefix if present
                    if (pathParts[0] === 'api') pathParts.shift();
                    if (pathParts.length >= 2) {
                        tableName = pathParts[0];
                        id = pathParts[1];
                    }
                    if (!tableName || !id) {
                        resolve(Response.json({ success: false, error: 'Table name and id required in URL path' }, { status: 400 }));
                        return;
                    }
                    if (!validateTable(tableName)) {
                        resolve(Response.json({ success: false, error: `Table "${tableName}" not found` }, { status: 404 }));
                        return;
                    }
                    const tableSchema = schema[tableName];
                    // Try to find the id column (assume 'id' exists)
                    const idColumn = tableSchema['id'];
                    if (!idColumn) {
                        resolve(Response.json({ success: false, error: 'No id column in table' }, { status: 400 }));
                        return;
                    }
                    let idValue: any = id;
                    if (/^\d+$/.test(id)) idValue = Number(id);
                    db.select().from(tableSchema).where(eq(idColumn, idValue)).limit(1).then((result: any[]) => {
                        if (!result || result.length === 0) {
                            resolve(Response.json({ success: false, error: 'Record not found' }, { status: 404 }));
                            return;
                        }
                        // Return a single object, not an array
                        resolve(Response.json({ success: true, data: result[0] }));
                    }).catch((error: any) => {
                        resolve(Response.json({ success: false, error: 'Database query failed', message: error.message }, { status: 500 }));
                    });
                } catch (error: any) {
                    resolve(Response.json({ success: false, error: 'Internal server error', message: error.message }, { status: 500 }));
                }
            });
        },
        /**
         * POST /{tableName} - Create records
         * Body: single object or array of objects
         */
        POST: (request: Request): Promise<Response> => {
            return new Promise((resolve) => {
                try {
                    const tableName = extractTableFromUrl(request.url)

                    if (!tableName) {
                        resolve(Response.json({
                            success: false,
                            error: 'Table name is required in URL path'
                        }, { status: 400 }))
                        return
                    }

                    if (!validateTable(tableName)) {
                        resolve(Response.json({
                            success: false,
                            error: `Table "${tableName}" not found`
                        }, { status: 404 }))
                        return
                    }

                    const tableSchema = schema[tableName]

                    request.json().then((data: any) => {
                        if (!data) {
                            resolve(Response.json({
                                success: false,
                                error: 'Request body is required'
                            }, { status: 400 }))
                            return
                        }

                        // Execute insert
                        const insertQuery = db.insert(tableSchema).values(data).returning()

                        insertQuery.then((result: any[]) => {
                            resolve(Response.json({
                                success: true,
                                data: result,
                                message: `Successfully created ${result.length} record(s)`
                            }))
                        }).catch((error: any) => {
                            console.error('Database insert error:', error)
                            resolve(Response.json({
                                success: false,
                                error: 'Database insert failed',
                                message: error.message
                            }, { status: 500 }))
                        })

                    }).catch(() => {
                        resolve(Response.json({
                            success: false,
                            error: 'Invalid JSON in request body'
                        }, { status: 400 }))
                    })

                } catch (error: any) {
                    console.error('POST handler error:', error)
                    resolve(Response.json({
                        success: false,
                        error: 'Internal server error',
                        message: error.message
                    }, { status: 500 }))
                }
            })
        },

        /**
         * PUT /{tableName}?where={...} - Update records
         * Body: object with fields to update
         */
        PUT: (request: Request): Promise<Response> => {
            return new Promise((resolve) => {
                try {
                    const tableName = extractTableFromUrl(request.url)

                    if (!tableName) {
                        resolve(Response.json({
                            success: false,
                            error: 'Table name is required in URL path'
                        }, { status: 400 }))
                        return
                    }

                    if (!validateTable(tableName)) {
                        resolve(Response.json({
                            success: false,
                            error: `Table "${tableName}" not found`
                        }, { status: 404 }))
                        return
                    }

                    const tableSchema = schema[tableName]
                    const params = parseQueryParams(request.url)

                    if (!params.where || typeof params.where !== 'object' || Object.keys(params.where).length !== 1 || !('id' in params.where)) {
                        resolve(Response.json({
                            success: false,
                            error: 'Update is only allowed by id. Use ?where={"id":1}'
                        }, { status: 400 }))
                        return
                    }

                    request.json().then((data: any) => {
                        if (!data || typeof data !== 'object') {
                            resolve(Response.json({
                                success: false,
                                error: 'Request body with update data is required'
                            }, { status: 400 }))
                            return
                        }

                        const whereCondition = buildWhereCondition(params.where!, tableSchema)
                        if (!whereCondition) {
                            resolve(Response.json({
                                success: false,
                                error: 'Invalid WHERE condition'
                            }, { status: 400 }))
                            return
                        }

                        // Execute update
                        const updateQuery = db.update(tableSchema)
                            .set(data)
                            .where(whereCondition)
                            .returning()

                        updateQuery.then((result: any[]) => {
                            resolve(Response.json({
                                success: true,
                                data: result,
                                message: `Successfully updated ${result.length} record(s)`
                            }))
                        }).catch((error: any) => {
                            console.error('Database update error:', error)
                            resolve(Response.json({
                                success: false,
                                error: 'Database update failed',
                                message: error.message
                            }, { status: 500 }))
                        })

                    }).catch(() => {
                        resolve(Response.json({
                            success: false,
                            error: 'Invalid JSON in request body'
                        }, { status: 400 }))
                    })

                } catch (error: any) {
                    console.error('PUT handler error:', error)
                    resolve(Response.json({
                        success: false,
                        error: 'Internal server error',
                        message: error.message
                    }, { status: 500 }))
                }
            })
        },

        /**
         * PATCH /{tableName}?where={...} - Update records (alias for PUT)
         */
        PATCH: (request: Request): Promise<Response> => {
            // PATCH is identical to PUT in this implementation
            return module.exports.createHandler(config).PUT(request)
        },

        /**
         * DELETE /{tableName}?where={...} - Delete records
         */
        DELETE: (request: Request): Promise<Response> => {
            return new Promise((resolve) => {
                try {
                    const tableName = extractTableFromUrl(request.url)

                    if (!tableName) {
                        resolve(Response.json({
                            success: false,
                            error: 'Table name is required in URL path'
                        }, { status: 400 }))
                        return
                    }

                    if (!validateTable(tableName)) {
                        resolve(Response.json({
                            success: false,
                            error: `Table "${tableName}" not found`
                        }, { status: 404 }))
                        return
                    }

                    const tableSchema = schema[tableName]
                    const params = parseQueryParams(request.url)

                    if (!params.where || typeof params.where !== 'object' || Object.keys(params.where).length !== 1 || !('id' in params.where)) {
                        resolve(Response.json({
                            success: false,
                            error: 'Delete is only allowed by id. Use ?where={"id":1}'
                        }, { status: 400 }))
                        return
                    }

                    const whereCondition = buildWhereCondition(params.where, tableSchema)
                    if (!whereCondition) {
                        resolve(Response.json({
                            success: false,
                            error: 'Invalid WHERE condition'
                        }, { status: 400 }))
                        return
                    }

                    // Execute delete
                    const deleteQuery = db.delete(tableSchema)
                        .where(whereCondition)
                        .returning()
                    deleteQuery.then((result: any[]) => {
                        resolve(Response.json({
                            success: true,
                            data: result,
                            message: `Successfully deleted ${result.length} record(s)`
                        }))
                    }).catch((error: any) => {
                        console.error('Database delete error:', error)
                        resolve(Response.json({
                            success: false,
                            error: 'Database delete failed',
                            message: error.message
                        }, { status: 500 }))
                    })

                } catch (error: any) {
                    console.error('DELETE handler error:', error)
                    resolve(Response.json({
                        success: false,
                        error: 'Internal server error',
                        message: error.message
                    }, { status: 500 }))
                }
            })
        }
    }
}

// Export types for better developer experience
export type { ApiResponse, QueryParams, MutationParams }
