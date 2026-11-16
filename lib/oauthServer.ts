/** Dozzier's OAuth 2.1 authorization server for MCP clients (Claude, ChatGPT…). Tokens are workspace API keys. */
export const ISSUER = "https://dozzier.co";
export const MCP_RESOURCE = `${ISSUER}/api/mcp`;
export const RESOURCE_METADATA = `${ISSUER}/.well-known/oauth-protected-resource`;

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const authServerMetadata = () => ({
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/oauth/authorize`,
  token_endpoint: `${ISSUER}/api/oauth/token`,
  registration_endpoint: `${ISSUER}/api/oauth/register`,
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code", "refresh_token"],
  code_challenge_methods_supported: ["S256"],
  token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
  scopes_supported: ["read", "write"],
  service_documentation: `${ISSUER}/docs/mcp`,
});

export const protectedResourceMetadata = () => ({
  resource: MCP_RESOURCE,
  authorization_servers: [ISSUER],
  scopes_supported: ["read", "write"],
  bearer_methods_supported: ["header"],
  resource_name: "Dozzier",
  resource_documentation: `${ISSUER}/docs/mcp`,
});
