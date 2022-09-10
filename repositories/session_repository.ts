import { Client } from "replit-db";

const db = new Client();

export async function setSession(userId: string, token: Auth0TokenResponse) {
  let uuid = crypto.randomUUID();
  let key = `${userId}_${uuid}`;
  await db.set(key, token);
  return key;
}