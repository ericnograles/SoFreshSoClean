import { HandlerContext } from "$fresh/server.ts";
import { oauth2Client } from 'services/oauth.ts'


export const handler = (_req: Request, _ctx: HandlerContext): Response => {
  return Response.redirect(oauth2Client.code.getAuthorizationUri());
};