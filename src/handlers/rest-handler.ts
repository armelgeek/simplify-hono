import { createHandler } from '../adapters/drizzle'
import { db } from '../db'
import * as schema from '../db/schema'

const handler = createHandler({ db, schema })
export const { GET, POST, PUT, PATCH, GET_BY_ID, DELETE } = handler
export { handler }
