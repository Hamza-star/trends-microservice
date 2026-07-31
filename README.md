# User Management NestJS Module

A NestJS + MongoDB starter module for user management, role-based access control, and JWT authentication. It is designed to be cloned into an application and extended without rebuilding the core authentication flow.

The module uses short-lived access tokens and database-backed, rotating refresh-token sessions. Refresh tokens are stored only in an `httpOnly` cookie on the client and as bcrypt hashes in MongoDB.

## What is included

- NestJS 11, TypeScript, MongoDB, and Mongoose
- Email/password authentication with bcrypt password hashing
- JWT access-token authentication via Passport
- Refresh-token sessions stored as bcrypt hashes in MongoDB
- Unique refresh-token IDs (`jti`) and token-family tracking
- Transactional refresh-token rotation
- Refresh-token replay detection and token-family revocation
- Logout for the current device
- Logout from all devices
- Role-based authorization with `JwtAuthGuard` and `AdminGuard`
- User, role, privilege, label, and menu modules
- DTO validation and a global HTTP exception filter

## Requirements

- Node.js 20+ recommended
- MongoDB 6+ configured as a **replica set**
- npm

MongoDB transactions are required for safe refresh-token rotation, logout, and logout-all. A standalone MongoDB server is not sufficient.

For local development, start a single-node replica set:

```bash
mongod --dbpath ./data --replSet rs0
```

Then, in `mongosh`:

```javascript
rs.initiate()
```

Use a replica-set URI in `.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/user-management-nestjs?replicaSet=rs0
```

## Quick start

```bash
git clone <repository-url>
cd user-management-nestjs
npm install
copy .env.example .env
npm run start:dev
```

Windows PowerShell users can use:

```powershell
Copy-Item .env.example .env
npm.cmd run start:dev
```

The API starts on `http://localhost:3000` unless `PORT` is changed.

## Environment variables

Create a `.env` file in the project root.

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/user-management-nestjs?replicaSet=rs0

# Use a long, random value. Do not commit this value.
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Optional; defaults to 10.
BCRYPT_SALT_ROUNDS=10
```

Generate a suitable development secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Authentication architecture

```text
Browser / client
    │
    ├─ access token in Authorization: Bearer <token>
    │      │
    │      └─ JwtAuthGuard → Passport JWT strategy → protected endpoint
    │
    └─ refresh token in httpOnly cookie
           │
           └─ /auth/refresh → signature + session validation + rotation
                                      │
                                      └─ MongoDB refresh_tokens collection
```

### Access token

The access token is returned in the login/refresh response body and should be sent on protected requests:

```http
Authorization: Bearer <access-token>
```

It includes:

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "role-id",
  "timezone": "Asia/Karachi"
}
```

Its default lifetime is 15 minutes.

### Refresh token

The refresh token is never returned in the JSON response. It is sent as the `refreshToken` `httpOnly` cookie and contains:

```json
{
  "sub": "user-id",
  "type": "refresh",
  "jti": "unique-token-id"
}
```

Its default lifetime is 7 days. The raw token is not stored in MongoDB.

### Refresh-token session document

Each session in the `refresh_tokens` collection contains:

| Field | Purpose |
| --- | --- |
| `userId` | Owner of the session |
| `tokenHash` | bcrypt hash of the refresh token; excluded from normal queries |
| `jti` | Unique ID from the refresh JWT |
| `familyId` | Links all rotated tokens from the same original login |
| `expiresAt` | Session expiry; MongoDB TTL index cleans it up |
| `revokedAt` / `revokedReason` | Server-side invalidation audit fields |

## Authentication flows

### 1. Login

```text
POST /auth/login
  → verify email and bcrypt password
  → issue access token
  → issue refresh token with a new jti
  → store bcrypt hash, jti, familyId, and expiry in MongoDB
  → set refreshToken httpOnly cookie
  → return access token and user
```

### 2. Refresh-token rotation

```text
POST /auth/refresh
  → read refreshToken cookie
  → verify JWT signature, expiry, type, and jti
  → verify active user status
  → load matching MongoDB session and compare bcrypt hash
  → transactionally revoke presented session as "rotated"
  → create a replacement session in the same token family
  → set replacement refresh-token cookie
  → return a new access token
```

### 3. Replay detection

If a refresh token that has already been rotated is presented again, it is treated as a possible stolen-token replay. All active refresh sessions in that token family are revoked with reason `replay-detected`. The client must log in again.

Clients should send only one refresh request at a time. Concurrent refresh requests can trigger the same replay protection and sign the device out.

### 4. Logout current device

```text
POST /auth/logout
  → verify the refresh-token cookie when present
  → revoke the active session family for that device
  → clear the refreshToken cookie
```

The route is idempotent: clearing an absent, expired, or invalid cookie still succeeds.

### 5. Logout from all devices

```text
POST /auth/logout-all
Authorization: Bearer <access-token>
  → revoke all active refresh sessions for the authenticated user
  → clear the current browser cookie
```

Existing access tokens remain valid until their short expiry. This is expected for stateless access tokens.

## Auth API reference

### `POST /auth/signup`

```json
{
  "email": "user@example.com",
  "password": "Password@123"
}
```

Password requirements are enforced by `SignupDto`.

> The current `Users` schema requires a role. For a plug-and-play application, seed a default role and assign it during signup, or create users through the admin user-management endpoint. Do not expose public signup until the default-role policy is defined.

### `POST /auth/login`

```json
{
  "email": "user@example.com",
  "password": "Password@123",
  "timezone": "Asia/Karachi"
}
```

Response:

```json
{
  "user": { "...": "..." },
  "accessToken": "eyJ..."
}
```

The response also sets the `refreshToken` cookie.

### `POST /auth/refresh`

No JSON body is required. The browser must send the refresh cookie.

Response:

```json
{
  "accessToken": "eyJ..."
}
```

### `POST /auth/logout`

No request body is required. Clears and revokes the current device refresh session.

### `POST /auth/logout-all`

Requires a valid access token:

```http
Authorization: Bearer <access-token>
```

## Using authentication in a new module

Inject no authentication service into ordinary protected controllers. Apply the guard instead:

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.authguard';

@Controller('reports')
export class ReportsController {
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return [];
  }
}
```

After `JwtAuthGuard`, `request.user` contains:

```ts
{
  userId: string;
  email: string;
  role: string;
  timezone: string;
}
```

For admin-only endpoints, compose the guards:

```ts
@UseGuards(JwtAuthGuard, AdminGuard)
```

`AdminGuard` loads the role from MongoDB and requires `role.isAdmin === true`.

## Client integration guidance

- Store the access token in application memory when possible.
- Do not store the refresh token in JavaScript storage (`localStorage`, `sessionStorage`, Redux, or Zustand).
- Send `credentials: 'include'` with browser requests that need the refresh cookie.
- On an API `401`, make one refresh request, update the access token, then retry the original request once.
- Serialize refresh calls with a client-side mutex/queue. Do not refresh concurrently.
- On refresh failure, clear local application state and redirect to login.
- Call `/auth/logout` when signing out from this browser.
- Call `/auth/logout-all` after a password change, suspected compromise, or account recovery.

Example using `fetch`:

```ts
await fetch('http://localhost:3000/auth/refresh', {
  method: 'POST',
  credentials: 'include',
});
```

## Project structure

```text
src/
├── auth/
│   ├── auth.controller.ts          # Login, refresh, logout endpoints
│   ├── auth.service.ts             # Authentication orchestration
│   ├── auth-token.service.ts       # Centralized JWT issuance/verification
│   ├── refresh-token.service.ts    # Session persistence, rotation, revocation
│   ├── jwt.strategy.ts             # Bearer access-token Passport strategy
│   ├── jwt.authguard.ts            # JwtAuthGuard
│   ├── roles.authguard.ts          # AdminGuard
│   └── schema/refresh-token.schema.ts
├── users/
├── roles/
├── privelleges/
├── menu/
├── labels/
└── main.ts
```

## Production checklist

Before exposing this project publicly, complete these environment and policy decisions:

- [ ] Set cookie `secure: true` when using HTTPS in production.
- [ ] Make cookie `secure`, `sameSite`, `domain`, and `maxAge` environment-driven.
- [ ] Restrict CORS to explicit frontend origins; do not use unrestricted reflected origins.
- [ ] Fail startup when `JWT_SECRET` is missing; never rely on the development fallback secret.
- [ ] Add JWT `issuer` and `audience` configuration and validation.
- [ ] Reject `inactive` and `banned` users during login, not only token refresh.
- [ ] Enforce HTTPS and set secure reverse-proxy configuration.
- [ ] Decide whether cross-site cookies are required. If `SameSite=None` is needed, implement CSRF protection.
- [ ] Configure monitoring, audit logs, backups, and secret management.
- [ ] Run MongoDB as a replica set in every environment.
- [ ] Add integration tests against a real MongoDB replica set.

## Development commands

```bash
npm run start:dev
npm run build
npm test -- --runInBand
npm run test:e2e
```

On Windows where PowerShell script execution blocks npm, use `npm.cmd` instead:

```powershell
npm.cmd run build
npx.cmd jest --runInBand
```

## Extension rules for contributors

1. Keep controllers thin; place business logic in services.
2. Use DTOs and `class-validator` for every external request body.
3. Protect private routes with `JwtAuthGuard`.
4. Use `AdminGuard` only where administrator access is genuinely required.
5. Never return `password`, `tokenHash`, or a raw refresh token in API responses or logs.
6. Do not bypass `RefreshTokenService` when creating, rotating, or revoking refresh tokens.
7. Preserve refresh-token transaction boundaries when changing authentication code.
8. Add focused unit tests and integration tests for every auth-flow change.

## License

Private / project-specific. Update this section if the repository is released publicly.
