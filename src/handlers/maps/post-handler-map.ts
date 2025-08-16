import { POST } from '../rest-handler';
import { PostHandlerStrategy, PostsTableHandler, DefaultTableHandler } from '../strategies/post-strategy';

const postHandlerFn = async (req: Request, c: any) => POST(req);

export const postHandlerMap: Record<string, PostHandlerStrategy> = {
  posts: new PostsTableHandler(postHandlerFn),
};
export const defaultPostHandler = new DefaultTableHandler(postHandlerFn);
