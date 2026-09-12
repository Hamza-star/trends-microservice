# Trends Service

Standalone NestJS service for querying configured Trends MongoDB collections.

## Request Flow

```text
Frontend
  -> POST /trends with projectId
  -> Trends Service
  -> ProjectConfigService resolves projectId from configuration DB/cache
  -> database and active collections
  -> MongoDB aggregation
  -> response
```

The frontend sends a `projectId`, but never sends a database name, collection names, MongoDB URI, or database credentials. Trends does not use frontend authentication yet. Configuration CRUD is protected with the configured admin token.

## Configuration

Copy `.env.example` to `.env` and set:

```env
MONGO_URI=mongodb://127.0.0.1:27017
CONFIG_DB_NAME=trends_config
CONFIG_ADMIN_TOKEN=replace-with-config-admin-token
```

Projects and collections are stored in the configuration database. The service uses an in-memory cache with a 60-second TTL, and CRUD mutations invalidate the affected project.

## Configuration API

All configuration endpoints require `Authorization: Bearer <CONFIG_ADMIN_TOKEN>`.

Projects:

```text
POST   /projects
GET    /projects
GET    /projects/:projectId
PATCH  /projects/:projectId
DELETE /projects/:projectId  (soft delete)
```

Collections:

```text
POST   /projects/:projectId/collections
GET    /projects/:projectId/collections
PATCH  /projects/:projectId/collections/:collectionId
DELETE /projects/:projectId/collections/:collectionId  (soft delete)
```

Example project creation:

```json
{
  "projectId": "ems",
  "name": "EMS",
  "databaseName": "ems_db",
  "nodeRedUrls": ["http://localhost:1880"],
  "isActive": true
}
```

Example collection creation:

```json
{ "collectionName": "historical_z1", "isActive": true }
```

To add or change a project/database/collection, use these endpoints. No TypeScript change or Trends redeploy is required.

## Example Request

```http
POST /trends
Content-Type: application/json
```

```json
{
  "projectId": "ems",
  "start_date": "2026-06-01",
  "end_date": "2026-06-01",
  "start_time": "00:00:00",
  "end_time": "23:59:59",
  "meterIds": ["PG_PC_Z4_GW0_PLC2_EM11"],
  "suffixes": ["AMP_AVG", "CURR_L2"],
  "userTimezone": "Asia/Karachi"
}
```

The response format is unchanged: `{ "timezone": "...", "data": [...] }`.

## Development

```bash
npm install
npm run start:dev
npm run build
npm test
```
