import { postHandlerMap, defaultPostHandler } from '../maps/post-handler-map'
import {
  getHandlerMap, defaultGetHandler,
  putHandlerMap, defaultPutHandler,
  patchHandlerMap, defaultPatchHandler,
  deleteHandlerMap, defaultDeleteHandler,
  getByIdHandlerMap, defaultGetByIdHandler
} from '../maps/handler-maps'

/**
 * Register CRUD API routes, with optional exclusion of some tables
 * @param app Hono app
 * @param options { excludedTables?: string[] }
 */
export function registerApiRoutes(app: any, options?: { excludedTables?: string[] }) {
  const excluded = options?.excludedTables || [];
  function isAllowed(table: string) {
    return !excluded.includes(table);
  }
  app.get('/api/v1/:table/:id', async (c: any) => {
    const table = c.req.param('table');
    if (!isAllowed(table)) return c.json({ success: false, error: 'Forbidden table' }, 403);
    const handler = getByIdHandlerMap[table] || defaultGetByIdHandler;
    return handler.handle(c);
  })
  app.get('/api/v1/:table', async (c: any) => {
    const table = c.req.param('table');
    if (!isAllowed(table)) return c.json({ success: false, error: 'Forbidden table' }, 403);
    const handler = getHandlerMap[table] || defaultGetHandler;
    return handler.handle(c);
  })
  app.post('/api/v1/:table', async (c: any) => {
    const table = c.req.param('table');
    if (!isAllowed(table)) return c.json({ success: false, error: 'Forbidden table' }, 403);
    const handler = postHandlerMap[table] || defaultPostHandler;
    return handler.handle(c);
  })
  app.put('/api/v1/:table', async (c: any) => {
    const table = c.req.param('table');
    if (!isAllowed(table)) return c.json({ success: false, error: 'Forbidden table' }, 403);
    const handler = putHandlerMap[table] || defaultPutHandler;
    return handler.handle(c);
  })
  app.patch('/api/v1/:table', async (c: any) => {
    const table = c.req.param('table');
    if (!isAllowed(table)) return c.json({ success: false, error: 'Forbidden table' }, 403);
    const handler = patchHandlerMap[table] || defaultPatchHandler;
    return handler.handle(c);
  })
  app.delete('/api/v1/:table', async (c: any) => {
    const table = c.req.param('table');
    if (!isAllowed(table)) return c.json({ success: false, error: 'Forbidden table' }, 403);
    const handler = deleteHandlerMap[table] || defaultDeleteHandler;
    return handler.handle(c);
  })
}
