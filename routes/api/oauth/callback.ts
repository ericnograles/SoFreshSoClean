import { HandlerContext } from "$fresh/server.ts";
import { oauth2Client } from 'services/oauth.ts'


export const handler = (_req: Request, _ctx: HandlerContext): Response => {
  return new Response(JSON.stringify(_req));
};