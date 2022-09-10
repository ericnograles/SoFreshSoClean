interface Auth0TokenResponse = {
  accessToken: string;
  tokenType: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
  scope: Array<string>;
}
