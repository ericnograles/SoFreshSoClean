import { OAuth2Client } from "oauth2";

const OAUTH_CLIENT_ID = Deno.env.get('OAUTH_CLIENT_ID');
const OAUTH_CLIENT_SECRET = Deno.env.get('OAUTH_CLIENT_SECRET');

const oauth2Client = new OAuth2Client({
  clientId: OAUTH_CLIENT_ID,
  clientSecret: OAUTH_CLIENT_SECRET,
  authorizationEndpointUri: `https://nograles.us.auth0.com/authorize`,
  tokenUri: "https://nograles.us.auth0.com/oauth/token",
  resourceEndpointHost: "nograles.us.auth0.com",
  redirectUri: "https://sofreshcoclean.grales.repl.co/api/oauth/callback",
  defaults: {
    scope: "openid profile",
  },
});

export { oauth2Client };