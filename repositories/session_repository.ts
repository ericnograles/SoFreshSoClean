import { Client } from "replit-db";

const db = new Client();

export async function setSession(userId: string, token: Auth0TokenResponse) {
  await db.set(userId, token);
}