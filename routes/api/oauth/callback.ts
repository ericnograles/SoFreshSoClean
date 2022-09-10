import { Handlers } from "$fresh/server.ts";
import { oauth2Client, getUserProfile } from 'services/oauth.ts'
import { setSession } from 'repositories/session_repository.ts';
import * as cookie from "cookie";


export const handler: Handlers = {
  async GET(req) {
    const uuid = crypto.randomUUID();
    let oauthResponse = await oauth2Client.code.getToken(req.url);
    let profile = await getUserProfile(oauthResponse.accessToken);
    let user = await setSession(profile.sub, oauthResponse);
    return new Response(JSON.stringify({ ...oauthResponse }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};
