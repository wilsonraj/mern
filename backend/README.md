# MERN Backend — CRUD + Bulk Upload

A production-ready Node.js/Express/MongoDB backend boilerplate with:
- Standard CRUD (Products)
- User auth (register/login/JWT)
- Bulk upload via CSV or Excel (`.csv`, `.xlsx`, `.xls`)
- Centralized error handling, validation, and response formatting

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in your values
npm run dev             # starts with nodemon
```

Requires a running MongoDB instance (local or Atlas). Set `MONGO_URI` in `.env`.

## Folder Structure

```
src/
├── config/         # DB connection, multer (file upload) config
├── models/         # Mongoose schemas (Product, User)
├── controllers/    # Request/response handlers
├── services/       # Business logic (reusable, testable)
├── routes/         # Express route definitions
├── middlewares/    # Auth, validation, error handling
├── utils/          # Helpers (CSV/Excel parsing, logger, response formatter)
├── validations/     # Input validation rules
├── uploads/         # Temp storage for uploaded files (auto-cleaned)
├── app.js
└── server.js
```

## API Endpoints

### Auth
| Method | Endpoint            | Description        |
|--------|---------------------|---------------------|
| POST   | /api/users/register | Register new user   |
| POST   | /api/users/login    | Login, returns JWT  |
| GET    | /api/users/me        | Get current profile (auth required) |

### Products (CRUD)
| Method | Endpoint                    | Description                         |
|--------|------------------------------|--------------------------------------|
| GET    | /api/products                | List products (pagination/search/filter) |
| GET    | /api/products/:id            | Get single product                  |
| POST   | /api/products                | Create product (auth required)      |
| PUT    | /api/products/:id            | Update product (auth required)      |
| DELETE | /api/products/:id            | Delete single product (auth required) |
| DELETE | /api/products/bulk-delete    | Delete many products by ID array (auth required) |

Query params for `GET /api/products`: `page`, `limit`, `search`, `category`, `sortBy`

### Bulk Upload
| Method | Endpoint         | Description                          |
|--------|-------------------|---------------------------------------|
| POST   | /api/upload/bulk  | Upload CSV/Excel file (auth required) |

Send as `multipart/form-data` with field name `file`.

Expected columns (case-insensitive): `name`, `sku`, `category`, `price`, `quantity`, `description`.
A sample file is included at `sample-data/products-sample.csv`.

Response includes a summary:
```json
{
  "success": true,
  "data": {
    "totalRows": 100,
    "insertedCount": 97,
    "failedValidationCount": 3,
    "failedRows": [ { "row": 5, "data": {}, "errors": ["Price is required and must be a number"] } ],
    "insertErrors": []
  }
}
```

## Notes on Scaling Bulk Upload

- Rows are validated before insert; invalid rows are skipped and reported, not silently dropped.
- Inserts happen in batches of 500 (`BATCH_SIZE` in `bulkUpload.service.js`) with `ordered: false`, so one bad row doesn't block the rest of the batch.
- For very large files (100k+ rows) or to avoid blocking the request/response cycle, consider moving processing to a background job queue (e.g., BullMQ + Redis) and returning a job ID immediately, with a separate status endpoint to poll progress.
- Uploaded files are deleted from disk after processing.

## Testing Bulk Upload with curl

```bash
curl -X POST http://localhost:5000/api/upload/bulk \
  -H "Authorization: Bearer <your_token>" \
  -F "file=@sample-data/products-sample.csv"
```
