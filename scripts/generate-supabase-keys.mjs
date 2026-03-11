import crypto from "node:crypto";

const jwtSecret = process.argv[2];

if (!jwtSecret || jwtSecret.length < 32) {
  console.error("Usage: npm run supabase:keys -- <jwt-secret-with-at-least-32-characters>");
  process.exit(1);
}

const header = {
  alg: "HS256",
  typ: "JWT"
};

const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + 60 * 60 * 24 * 365 * 10;

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(payload) {
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", jwtSecret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${signature}`;
}

const anonKey = sign({
  iss: "supabase",
  ref: "local",
  role: "anon",
  iat: issuedAt,
  exp: expiresAt
});

const serviceRoleKey = sign({
  iss: "supabase",
  ref: "local",
  role: "service_role",
  iat: issuedAt,
  exp: expiresAt
});

console.log(`ANON_KEY=${anonKey}`);
console.log(`SERVICE_ROLE_KEY=${serviceRoleKey}`);
