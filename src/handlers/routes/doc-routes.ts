import { getOpenapiGET } from '../../adapters/openapi-handler'
import { apiReference } from '@scalar/hono-api-reference'

/**
 * Register OpenAPI/Swagger/Docs routes, with optional exclusion of tables
 * @param app Hono app
 * @param options { excludedTables?: string[] }
 */
export function registerDocRoutes(app: any, options?: { excludedTables?: string[] }) {
  const excludedTables = options?.excludedTables || [];
  const openapiGET = getOpenapiGET(excludedTables);
  app.get('/swagger', () => openapiGET());
  app.get(
    '/docs',
    apiReference({
      pageTitle: 'My API Reference',
      theme: 'deepSpace',
      layout: 'modern',
      darkMode: true,
      url: '/swagger'
    })
  )
}
