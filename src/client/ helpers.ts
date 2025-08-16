import type {
  ActionType,
  ExtractTables,
  OrderClause,
  SelectableColumns,
  SelectedData,
  UpdateWhereClause,
  WhereClause,
} from '../types'

/**
 * Creates query options for database read operations compatible with query libraries like React Query
 * Uses the new RESTful URL structure with table names in the path
 * @template TFrom - The table name type from the database schema
 * @template TSelect - The selectable columns type for the specified table
 * @template TData - The resulting data type after selection
 * @param {Object} options - Query configuration options
 * @param {TSelect} [options.select] - Object specifying which columns to select (optional, all columns by default)
 * @param {TFrom} options.from - The table name to query from
 * @param {WhereClause<ExtractTables[TFrom]['$inferSelect']>} [options.where] - Optional WHERE conditions
 * @param {OrderClause<TFrom>} [options.orderBy] - Optional ORDER BY clause
 * @param {number} [options.limit] - Optional limit for number of results
 * @param {number} [options.page] - Optional page number for pagination
 * @returns {Object} Object containing queryKey and queryFn for use with query libraries
 * @returns {string[]} returns.queryKey - Unique key array for caching the query
 * @returns {() => Promise<TData[]>} returns.queryFn - Async function that executes the database query
 *
 * @example
 * const userQuery = createDatabaseQueryOptions({
 *   select: { id: true, name: true, email: false },
 *   from: 'users',
 *   where: { age: { gte: 18 } },
 *   orderBy: { name: 'asc' },
 *   limit: 10,
 *   page: 1
 * })
 */

export function dbQuery<TFrom extends keyof ExtractTables, TSelect extends SelectableColumns<TFrom>, TData = SelectedData<TSelect, TFrom>>(options: {
  select?: TSelect
  from: TFrom
  where?: WhereClause<ExtractTables[TFrom]['$inferSelect']>
  orderBy?: OrderClause<TFrom, keyof TSelect>
  limit?: number
  page?: number
}): {
  queryKey: string[]
  queryFn: () => Promise<{ success: boolean, data: TData[], meta?: any, error?: string }>
} {
  const searchParams = new URLSearchParams()
  if (options.select) {
    const selected = Object.entries(options.select).filter(([, v]) => v).map(([k]) => k)
    if (selected.length) searchParams.set('select', selected.join(','))
  }
  if (options.where) searchParams.set('where', JSON.stringify(options.where))
  if (options.orderBy) searchParams.set('orderBy', JSON.stringify(options.orderBy))
  if (options.limit) searchParams.set('limit', String(options.limit))
  if (options.page) searchParams.set('page', String(options.page))

  const url = `/${String(options.from)}${searchParams.toString() ? '?' + searchParams.toString() : ''}`
  return {
    queryKey: ['db', String(options.from), searchParams.toString()],
    queryFn: async () => {
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || res.statusText)
      return json
    }
  }
}

/**
 * Helper pour mutations (insert, update, delete) sur l'API REST backend
 *
 * @example
 * // Insert
 * const { mutationFn } = dbMutation({ action: 'insert', table: 'users' })
 * await mutationFn({ name: 'John', email: 'john@example.com' })
 *
 * // Update
 * const { mutationFn } = dbMutation({ action: 'update', table: 'users' })
 * await mutationFn({ where: { id: { eq: 1 } }, data: { name: 'Jane' } })
 *
 * // Delete
 * const { mutationFn } = dbMutation({ action: 'delete', table: 'users' })
 * await mutationFn({ id: { eq: 1 } })
 */
export function dbMutation<TAction extends ActionType, TTable extends keyof ExtractTables>(options: {
  action: TAction
  table: TTable
}): {
  mutationKey: string[]
  mutationFn: (data: any) => Promise<{ success: boolean, data?: any, error?: string }>
} {
  const mutationKey = ['db', options.action, String(options.table)]
  return {
    mutationKey,
    mutationFn: async (data: any) => {
      let url = `/${String(options.table)}`
      let method = 'POST'
      let body: string | undefined
      const searchParams = new URLSearchParams()
      if (options.action === 'insert') {
        method = 'POST'
        body = JSON.stringify(data)
      } else if (options.action === 'update') {
        method = 'PUT'
        searchParams.set('where', JSON.stringify(data.where))
        url += `?${searchParams.toString()}`
        body = JSON.stringify(data.data)
      } else if (options.action === 'delete') {
        method = 'DELETE'
        searchParams.set('where', JSON.stringify(data))
        url += `?${searchParams.toString()}`
        body = '{}'
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || res.statusText)
      return json
    }
  }
}

/**
 * Parses a record of string values into their appropriate JavaScript types
 * @param {Record<string, string>} data - Object with string values to be parsed
 * @returns {Record<string, unknown>} Object with values converted to appropriate types
 *
 * @description
 * Converts string values to:
 * - Boolean: 'true' → true, 'false' → false
 * - Number: Valid numeric strings → Number
 * - Date: ISO-like date strings (YYYY-MM-DD format) → Date objects
 * - String: Everything else remains as string
 *
 * @example
 * parseJson({
 *   id: '123',
 *   active: 'true',
 *   createdAt: '2023-01-01T00:00:00Z',
 *   name: 'John'
 * })
 * // Returns: { id: 123, active: true, createdAt: Date, name: 'John' }
 */
function parseJson(data: Record<string, string>): Record<string, unknown> {
  const isDate = (value: string) => {
    const date = new Date(value)
    return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value) // ISO-like format
  }

  const parsed: Record<string, unknown> = {}

  for (const key in data) {
    const value = data[key]

    if (typeof value !== 'string') {
      parsed[key] = value
      continue
    }

    if (value === 'true') parsed[key] = true
    else if (value === 'false') parsed[key] = false
    else if (!isNaN(Number(value))) parsed[key] = Number(value)
    else if (isDate(value)) parsed[key] = new Date(value)
    else parsed[key] = value
  }

  return parsed
}
