import { OAuth2Client } from "oauth2";

const OAUTH_CLIENT_ID = Deno.env.get('OAUTH_CLIENT_ID');
const OAUTH_CLIENT_SECRET = Deno.env.get('OAUTH_CLIENT_SECRET');
const OAUTH_BASE_URL = Deno.env.get('OAUTH_BASE_URL');
const OAUTH_REDIRECT_URI = Deno.env.get('OAUTH_REDIRECT_URI');
const OAUTH_AUDIENCE = Deno.env.get('OAUTH_AUDIENCE');

const oauth2Client = new OAuth2Client({
  clientId: OAUTH_CLIENT_ID,
  clientSecret: OAUTH_CLIENT_SECRET,
  authorizationEndpointUri: `${OAUTH_BASE_URL}/authorize`,
  tokenUri: `${OAUTH_BASE_URL}/oauth/token`,
  resourceEndpointHost: OAUTH_AUDIENCE,
  redirectUri: OAUTH_REDIRECT_URI,
  defaults: {
    scope: "openid profile offline_access",
  },
});

export { oauth2Client };