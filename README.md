# Trends Service

Standalone NestJS service for querying configured Trends MongoDB collections.

## Request Flow

```text
Frontend
  -> POST /trends with projectId
  -> Trends Service
  -> projectId resolves server-side database and collections
  -> MongoDB aggregation
  -> response
```

The frontend sends a `projectId`, but never sends a database name, collection names, MongoDB URI, or database credentials. Authentication is intentionally not implemented yet.

## Configuration

Copy `.env.example` to `.env` and set:

```env
MONGO_URI=mongodb://127.0.0.1:27017
```

Project mappings are maintained in `src/config/trends-projects.constants.ts`:

```text
projectId -> { dbName, collections }
```

To add a project, add an entry to the constants file. To add a collection, append it to that project's collection list. To change a project's database, update only its `dbName`. CORS origins are declared in `src/main.ts`.

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
