import { Handlers } from "$fresh/server.ts";
import { oauth2Client } from 'services/oauth.ts'


export const handler: Handlers = {
  async GET(req) {
    const uuid = crypto.randomUUID();
    let token = await oauth2Client.code.getToken(req.url);
    return new Response(JSON.stringify({ ...token }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};