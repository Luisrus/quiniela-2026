import { GoogleAuth } from 'google-auth-library';

export async function createAccessTokenForScopes(scopes) {
  const auth = new GoogleAuth({ scopes });
  const client = await auth.getClient();
  const response = await client.getAccessToken();

  if (typeof response.token !== 'string' || response.token.trim() === '') {
    throw new Error('No se pudo obtener access token desde Application Default Credentials.');
  }

  return response.token;
}
