import { postHandlerMap, defaultPostHandler } from '../maps/post-handler-map'
import {
  getHandlerMap, defaultGetHandler,
  putHandlerMap, defaultPutHandler,
  patchHandlerMap, defaultPatchHandler,
  deleteHandlerMap, defaultDeleteHandler,
  getByIdHandlerMap, defaultGetByIdHandler
} from '../maps/handler-maps'

export function registerApiRoutes(app: any) {
  app.get('/:table/:id', async (c: any) => {
    const table = c.req.param('table');
    const handler = getByIdHandlerMap[table] || defaultGetByIdHandler;
    return handler.handle(c);
  })
  app.get('/:table', async (c: any) => {
    const table = c.req.param('table');
    const handler = getHandlerMap[table] || defaultGetHandler;
    return handler.handle(c);
  })
  app.post('/:table', async (c: any) => {
    const table = c.req.param('table');
    const handler = postHandlerMap[table] || defaultPostHandler;
    return handler.handle(c);
  })
  app.put('/:table', async (c: any) => {
    const table = c.req.param('table');
    const handler = putHandlerMap[table] || defaultPutHandler;
    return handler.handle(c);
  })
  app.patch('/:table', async (c: any) => {
    const table = c.req.param('table');
    const handler = patchHandlerMap[table] || defaultPatchHandler;
    return handler.handle(c);
  })
  app.delete('/:table', async (c: any) => {
    const table = c.req.param('table');
    const handler = deleteHandlerMap[table] || defaultDeleteHandler;
    return handler.handle(c);
  })
}
