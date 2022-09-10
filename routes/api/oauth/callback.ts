import { Handlers } from "$fresh/server.ts";
import { oauth2Client, getUserProfile } from 'services/oauth.ts'
import { setSession } from 'repositories/session_repository.ts';
import { setCookie } from "cookie";


export const handler: Handlers = {
  async GET(req) {
    let oauthResponse = await oauth2Client.code.getToken(req.url);
    let profile = await getUserProfile(oauthResponse.accessToken);
    let sessionId = await setSession(profile.sub, oauthResponse);
    let response = new Response(JSON.stringify({ ...oauthResponse }), {
      headers: { "Content-Type": "application/json" },
    });
    setCookie(response.headers, { name: 'session_id', value: sessionId, maxAge: 3600 })
    return response;
  },
};
