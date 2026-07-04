export const getGoogleOAuthRedirectUri = () =>
  process.env.GOOGLE_OAUTH_REDIRECT_URI ||
  process.env.OAUTH_REDIRECT_URI ||
  "http://localhost:8000/api/v1/oauth2callback";