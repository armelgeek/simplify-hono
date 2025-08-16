import type { Context } from 'hono';

export abstract class PostHandlerStrategy {
  abstract handle(c: Context): Promise<Response>;
}

export class PostsTableHandler extends PostHandlerStrategy {
  constructor(private _postHandler: (req: Request, c: Context) => Promise<Response>) {
    super();
  }
  async handle(c: Context): Promise<Response> {
    const userId = c.req.header('x-user-id');
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ success: false, error: 'Invalid JSON body' }, 400);
    }
    const data = userId ? { ...body, userId } : body;
    const req = new Request(c.req.raw, { body: JSON.stringify(data), method: 'POST', headers: c.req.raw.headers });
    return this._postHandler(req, c);
  }
}

export class DefaultTableHandler extends PostHandlerStrategy {
  constructor(private _postHandler: (req: Request, c: Context) => Promise<Response>) {
    super();
  }
  async handle(c: Context): Promise<Response> {
    return this._postHandler(c.req.raw, c);
  }
}
