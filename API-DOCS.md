# API Documentation

Base URL for local development: `http://localhost:3000`

## Login and responses

Most endpoints require a bearer token. First log in:

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "manager-a@example.com",
  "password": "your-seed-password"
}
```

If the account has more than one merchant membership, include the
`membershipId` returned for that account. The login response contains the
token under `data.accessToken`.

Send the token with protected requests:

```http
Authorization: Bearer <accessToken>
```

Successful responses have this format:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Products successfully fetched",
  "data": [],
  "timestamp": "2026-11-22T00:00:00.000Z"
}
```

The value inside `data` depends on the endpoint. Errors include `success:
false`, a `statusCode`, and a `message`.

## Endpoints

### Health

| Method | Path | Access |
|---|---|---|
| GET | `/health` | Public |

### Authentication

| Method | Path | Access |
|---|---|---|
| POST | `/auth/login` | Public |

### Merchants

| Method | Path | Access |
|---|---|---|
| POST | `/merchants` | Platform admin |
| GET | `/merchants` | Platform admin or merchant owner |
| GET | `/merchants/:id` | Merchant owner for that merchant, or platform admin |
| PATCH | `/merchants/:id` | Merchant owner for that merchant, or platform admin |

Create merchant:

```json
{ "name": "New Merchant" }
```

Update merchant:

```json
{ "name": "Updated Merchant Name" }
```

### Stores

| Method | Path | Access |
|---|---|---|
| POST | `/stores` | Merchant owner or platform admin |
| GET | `/stores` | Signed-in user with store access |
| GET | `/stores/:id` | User with access to that store |
| PATCH | `/stores/:id` | User with access to that store and update permission |

Create store:

```json
{
  "name": "Downtown Store",
  "address": "Main Street"
}
```

A platform admin must also provide `merchantId`. A merchant owner creates
stores in their own merchant; the merchant ID is taken from their membership.

### Products

| Method | Path | Access |
|---|---|---|
| POST | `/products` | Merchant owner |
| GET | `/products` | User with product read permission |
| GET | `/products/:id` | User with product read permission |
| PATCH | `/products/:id` | Merchant owner |

Create product:

```json
{
  "sku": "ITEM-001",
  "name": "Sample Product",
  "description": "Optional description",
  "price": 19.99
}
```

Update product accepts any of the same fields. The product belongs to the
signed-in user's merchant.

### Inventory

| Method | Path | Access |
|---|---|---|
| GET | `/inventory` | Store user with inventory read permission |
| GET | `/inventory/:productId` | Store user with inventory read permission |
| PATCH | `/inventory/:productId/restock` | User with inventory restock permission |

Restock inventory:

```json
{
  "quantity": 5
}
```

The quantity must be a positive whole number. Inventory is scoped to the
signed-in user's store.

### Sales

| Method | Path | Access |
|---|---|---|
| POST | `/sales` | Store user with sale create permission |
| GET | `/sales` | Store user with sale read permission |
| GET | `/sales/:id` | Store user with sale read permission |

Create a sale. Include a new `Idempotency-Key` header for each new request; use
the same key when retrying that request.

```http
POST /sales
Idempotency-Key: a-unique-request-key
```

```json
{
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 1
    }
  ],
  "paymentMethod": "CASH"
}
```

Allowed payment methods are `CASH`, `CARD`, and `OTHER`. Prices are read from
the database; clients do not send prices or totals.

### Users

| Method | Path | Access |
|---|---|---|
| POST | `/users` | Platform admin, merchant owner, or store manager |
| GET | `/users` | User with user read permission |
| GET | `/users/me` | User with user read permission |
| GET | `/users/:id` | User with user read permission |

Create user:

```json
{
  "name": "New Cashier",
  "email": "cashier@example.com",
  "password": "ChangeMe123!",
  "role": "CASHIER",
  "storeId": "store-uuid"
}
```

Roles available for a new user are `MERCHANT_OWNER`, `STORE_MANAGER`,
`INVENTORY_MANAGER`, and `CASHIER`.

- A platform admin creates a `MERCHANT_OWNER` by providing `merchantId`.
- A merchant owner can create a store manager, inventory manager, or cashier
  for an active store in the owner's merchant. Include `storeId`.
- A store manager can create only an inventory manager or cashier in the
  manager's own store. The manager's store is used automatically.
- Merchant users cannot create another merchant owner.

## Seeded role access

| Role | Main access |
|---|---|
| Platform admin | Platform administration; can create merchants and merchant owners |
| Merchant owner | Manage their merchant, stores, products, users, inventory, and sales |
| Store manager | Read/update their store, read products, manage users, inventory, and sales |
| Inventory manager | Read stores/products and manage inventory |
| Cashier | Read stores/products and create/read sales |

The actual permission checks are applied by the API. Tenant users can only
access the merchants and stores allowed by their active membership.

## Running the examples

Use the Postman collection at
`postman/Multi-Tenant-POS.postman_collection.json`. Set `samplePassword` to
the value of `SEED_SAMPLE_PASSWORD`, then run the login request for the account
you want to use.
