import { openapiGET } from '../../adapters/openapi-handler'
import { apiReference } from '@scalar/hono-api-reference'

export function registerDocRoutes(app: any) {
  app.get('/swagger', () => openapiGET())
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
