import { GET, PUT, PATCH, GET_BY_ID, DELETE } from '../rest-handler'

export type HandlerStrategy = {
  handle: (c: any) => Promise<Response>
}

class DefaultHandler implements HandlerStrategy {
  constructor(private fn: (req: Request) => Promise<Response>) {}
  async handle(c: any) {
    return this.fn(c.req.raw)
  }
}

export const getHandlerMap: Record<string, HandlerStrategy> = {}
export const defaultGetHandler = new DefaultHandler(GET)

export const putHandlerMap: Record<string, HandlerStrategy> = {}
export const defaultPutHandler = new DefaultHandler(PUT)

export const patchHandlerMap: Record<string, HandlerStrategy> = {}
export const defaultPatchHandler = new DefaultHandler(PATCH)

export const deleteHandlerMap: Record<string, HandlerStrategy> = {}
export const defaultDeleteHandler = new DefaultHandler(DELETE)

export const getByIdHandlerMap: Record<string, HandlerStrategy> = {}
export const defaultGetByIdHandler = new DefaultHandler(GET_BY_ID)
