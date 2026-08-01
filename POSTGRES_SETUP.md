# Managed PostgreSQL setup

The live Site intentionally remains on its included D1 database until a managed PostgreSQL project is connected and tested. This avoids surprise billing and keeps the current service available.

## Free-first setup (Neon)

1. Create a Neon account and a free project named `today-focus`.
2. Choose the closest available region to the majority of users.
3. Open the SQL editor and run `postgres/001_initial.sql`.
4. Copy the **pooled** connection string. Treat it as a password.
5. Add it to the Site's server-side environment as `DATABASE_URL`. Never put it in source code, browser code, screenshots, or chat.
6. Before switching production traffic, migrate D1 data, compare row counts per table, test account isolation, and run the 1,000-user load suite.

## Cutover gate

Do not switch production to PostgreSQL until all of these pass:

- Zero lost or duplicate task writes during retry tests.
- A user cannot read, edit, delete, share, or classify another user's records.
- Stone rewards remain one-per-task after retries and completion toggles.
- 1,000 concurrent active users and a 1,000-write burst stay below 1% errors.
- p95 latency is below 2 seconds for task reads and writes.
- Rollback to D1 has been rehearsed before the final cutover.

