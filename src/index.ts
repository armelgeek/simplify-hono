import { registerApiRoutes } from './handlers/routes/rest-routes';
import { registerDocRoutes } from './handlers/routes/doc-routes';
import { OpenAPIHono } from '@hono/zod-openapi';

const app = new OpenAPIHono();
registerDocRoutes(app);
registerApiRoutes(app);


export default app
