import { OAuth2Client } from "oauth2"; // See import_map.json

const OAUTH_CLIENT_ID = Deno.env.get("OAUTH_CLIENT_ID");
const OAUTH_CLIENT_SECRET = Deno.env.get("OAUTH_CLIENT_SECRET");
const OAUTH_BASE_URL = Deno.env.get("OAUTH_BASE_URL");
const OAUTH_REDIRECT_URI = Deno.env.get("OAUTH_REDIRECT_URI");
const OAUTH_AUDIENCE = Deno.env.get("OAUTH_AUDIENCE");

const oauth2Client = new OAuth2Client({
  clientId: OAUTH_CLIENT_ID,
  clientSecret: OAUTH_CLIENT_SECRET,
  authorizationEndpointUri: `${OAUTH_BASE_URL}/authorize`,
  tokenUri: `${OAUTH_BASE_URL}/oauth/token`,
  resourceEndpointHost: OAUTH_AUDIENCE,
  redirectUri: OAUTH_REDIRECT_URI,
  defaults: {
    scope: "openid email profile offline_access",
  },
});

const getUserProfile = async (accessToken) => {
  try {
    let url = `${OAUTH_BASE_URL}/userinfo`;
    let options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      }
    };
    let response = await fetch(url, options);
    let json = await response.json();
    return json;
  } catch (err) {
    console.error(err)
  }
};

export { getUserProfile, oauth2Client };
