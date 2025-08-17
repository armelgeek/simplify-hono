import { registerApiRoutes } from './handlers/routes/rest-routes';
import { registerDocRoutes } from './handlers/routes/doc-routes';
import { OpenAPIHono } from '@hono/zod-openapi';

const app = new OpenAPIHono();
app.get('/', (c) => c.json({ message: 'Welcome to the API' }));
const excludedTables = ['users'];
registerDocRoutes(app, { excludedTables });
registerApiRoutes(app, { excludedTables });

export default app
