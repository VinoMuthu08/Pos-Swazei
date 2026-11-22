# Pos-Swazei - Multi-Tenant POS API

Backend API built with NestJS, TypeScript, PostgreSQL, Prisma, and Redis.

## Get the project

In a terminal, run:

```sh
git clone https://github.com/VinoMuthu08/Pos-Swazei.git
cd Pos-Swazei
```

## Run locally

1. Install Node.js, PostgreSQL, and Redis.
2. Run `npm ci`.
3. Copy `.env.example` to `.env`. Set the database URL, Redis URL, JWT secret,
   and a local `SEED_SAMPLE_PASSWORD`.
4. Create the database tables and sample data:

   ```sh
   npx prisma generate
   npx prisma migrate deploy
   npm run db:seed
   ```

5. Start the API with `npm run start:dev`.

The seed creates:

- One platform admin: `admin@example.com`.
- Two merchants, each with one merchant owner and one store.
- One store manager, inventory manager, and cashier for each store.
- One product and 20 starting inventory units for each store.

All sample accounts use the password set in `SEED_SAMPLE_PASSWORD`. Log in as
`manager-a@example.com` and `manager-b@example.com` to compare each merchant's
products. Each account only sees data for its own merchant/store.

The seed also creates the `MERCHANT_OWNER`, `PLATFORM_ADMIN`, `STORE_MANAGER`,
`INVENTORY_MANAGER`, and `CASHIER` roles and their permissions. Seed account
emails, merchant/store/product names, store addresses, and product price are
read from the matching `SEED_*` settings in `.env`. The same product price is
used for both sample merchants.

## API

See [API-DOCS.md](./API-DOCS.md) for request examples, role access, and response
formats.

- `POST /auth/login` logs in and returns a bearer token.
- Merchants: `POST /merchants`, `GET /merchants`, `GET /merchants/:id`,
  `PATCH /merchants/:id`.
- Stores: `POST /stores`, `GET /stores`, `GET /stores/:id`,
  `PATCH /stores/:id`.
- Products: `GET /products`, `GET /products/:id`, `POST /products`,
  `PATCH /products/:id`.
- Inventory: `GET /inventory`, `GET /inventory/:productId`,
  `PATCH /inventory/:productId/restock`.
- Sales: `POST /sales`, `GET /sales`, `GET /sales/:id`.
- Users: `POST /users`, `GET /users`, `GET /users/:id`, `GET /users/me`.
- `GET /health` checks that the API is running.

Successful API responses use the common format below. The `message` describes
the operation, and `data` contains the endpoint result:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Products successfully fetched",
  "data": [],
  "timestamp": "2026-11-22T00:00:00.000Z"
}
```

Use the Postman collection in `postman/Multi-Tenant-POS.postman_collection.json`.
Set `samplePassword` to the password from `SEED_SAMPLE_PASSWORD`, then use the
collection's login requests for the manager, owner, or platform-admin examples.

## Important behavior

- JWT and permission guards are registered globally in `AppModule`.
- `@Permissions('product:read')` names the permission required by a route.
- The permission guard checks the signed-in user's permissions.
- Tenant users access merchants and stores through their signed-in membership,
  not request IDs, to keep each tenant's data separate.
- Merchant owners can create store managers, inventory managers, and cashiers
  for an active store in their merchant. Store managers can create only
  inventory managers and cashiers in their own store. Users cannot create
  another merchant owner. Platform admins can create a merchant owner for an
  active merchant with `POST /users`, passing `role: "MERCHANT_OWNER"` and
  the target `merchantId`. Merchant owners creating a user must pass the
  target `role` and `storeId`; store managers use their assigned store.
- Sales use database product prices. Stock updates, sale records, and payment
  records are handled in a database transaction.
- Sale requests need an `Idempotency-Key` header so a retry does not create a
  second sale.
- Set `MOCK_PAYMENT_MODE` to `SUCCESS` or `FAILURE` to test payments.
- Product lists are cached in Redis for 60 seconds.

## Checks

```sh
npm run build
npm test -- --runInBand
npm run test:e2e
npm run lint
```
