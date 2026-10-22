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
copy .env.example .env # Windows
# cp .env.example .env # macOS/Linux
# then fill in your values
npm run dev             # starts with nodemon
```

Requires a running MongoDB instance (local or Atlas). Copy `.env.example` to `.env`
and set `MONGO_URI` to your MongoDB connection string plus distinct, long random
values for `JWT_SECRET` and `JWT_REFRESH_SECRET`. Set `FRONTEND_URL` to the frontend
origin when it differs from `http://localhost:3000`.

### Google and Microsoft sign-in

Create OAuth applications with Google Identity Services and Microsoft Entra ID,
then set the same client IDs in both applications:

- Backend `.env`: `GOOGLE_CLIENT_ID` and `MICROSOFT_CLIENT_ID`
- Frontend `.env`: `VITE_GOOGLE_CLIENT_ID` and `VITE_MICROSOFT_CLIENT_ID`

For Google, add the frontend origin to the OAuth client's authorized JavaScript
origins. For Microsoft, register a single-page application redirect URI matching
the frontend origin (for local development, `http://localhost:3000`) and choose
the supported account types you want to allow. Restart both servers after
changing environment variables.

The backend verifies each provider's signed ID token and audience before creating
an account or issuing the app's access and refresh tokens. A provider identity is
stored separately from password accounts; accounts with an existing email are
not automatically linked and must first sign in with their existing method.

### Admin, friends, and messaging

Register the account that should be the first administrator, then promote it
from the backend terminal:

```bash
npm run admin:promote -- admin@example.com
```

This command requires access to the backend machine and MongoDB. Sign out and
back in (or reload the app) to refresh the account's role in the interface.
Additional admins can be promoted in the Admin page.

Public registration supports **patient** and **doctor** accounts only. Admin
accounts are assigned by an existing admin or with the trusted
`admin:promote` backend command; never expose admin assignment in public signup.
On backend startup, existing regular accounts with the old `user` role are
migrated to `patient`; administrator roles are not changed.
Doctors can complete their profile, set repeating weekly availability windows,
add one-time appointment times, and accept or decline requests. Each availability
window offers 30-minute appointments for the next 90 days in the doctor's time
zone. Doctor signup is immediately enabled as selected. Patients may request
video consultations or clinic visits; appointment requests do not collect
payments.

`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are only needed to refund
appointments that were paid before appointment payments were removed. Keep
these credentials on the backend only.

Users can search the directory and send/accept friend requests. Direct messages
between regular users are available only after the request is accepted.
Administrators can start a conversation with any user, and that user can reply.
Messages are stored in MongoDB and pushed to connected users over authenticated
Socket.IO connections, and new incoming messages trigger an in-app notification.
One-to-one audio and video calls use authenticated Socket.IO signaling and
browser WebRTC media; both participants must be online and permitted to chat.
Call state is held in backend memory, so a multi-instance deployment needs
shared Socket.IO room delivery and coordinated call state.
Regular users can view the product catalog; product creation, editing, deletion,
and bulk upload require an administrator. The Admin page can create administrator
accounts, change account roles, or delete accounts; deletion also removes that
user's messages, friend requests, feed posts, likes, comments, and refresh
sessions.

Signed-in users can visit **Feed** to publish text and images, like posts,
comment, and share links. Feed images are limited to 5 MB and stored locally in
`src/uploads/feed`; keep that directory on persistent storage when deploying.

## Folder Structure

```
src/
├── config/         # DB connection, multer (file upload) config
├── models/         # Mongoose schemas (Product, User, FeedPost, ...)
├── controllers/    # Request/response handlers
├── services/       # Business logic (reusable, testable)
├── routes/         # Express route definitions
├── middlewares/    # Auth, validation, error handling
├── utils/          # Helpers (CSV/Excel parsing, logger, response formatter)
├── validations/     # Input validation rules
├── uploads/         # Temporary bulk files and persistent local feed images
├── app.js
└── server.js
```

## API Endpoints

### Auth
| Method | Endpoint            | Description        |
|--------|---------------------|---------------------|
| POST   | /api/users/register | Register, returns an access token and sets an HttpOnly refresh cookie |
| POST   | /api/users/login    | Login, returns an access token and sets an HttpOnly refresh cookie |
| POST   | /api/users/oauth/google | Verify Google ID token; create account or sign in |
| POST   | /api/users/oauth/microsoft | Verify Microsoft ID token; create account or sign in |
| POST   | /api/users/refresh  | Rotate refresh cookie and return a new access token |
| POST   | /api/users/logout   | Revoke refresh session and clear its cookie |
| GET    | /api/users/me       | Get current profile (access token required) |

### Community and administration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/community/directory | Search registered users |
| GET/POST | /api/community/friend-requests | List pending requests / send a request |
| PATCH | /api/community/friend-requests/:requestId | Accept or reject a request |
| DELETE | /api/community/friends/:userId | Remove a friend |
| GET/POST | /api/community/messages/:userId | Read or send a permitted direct conversation |
| GET | /api/community/unread-counts | Get total and per-conversation unread message counts |
| PATCH | /api/community/messages/:userId/read | Mark messages from a conversation as read |
| GET | /api/community/admin/users | List users (admin only) |
| POST | /api/community/admin/users | Create an administrator account (admin only) |
| PATCH | /api/community/admin/users/:userId/role | Change a user role (admin only) |
| DELETE | /api/community/admin/users/:userId | Delete a user account (admin only) |

### Doctor appointments (authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/appointments/doctors | List doctors and available appointment times |
| POST | /api/appointments | Request an appointment; the request awaits doctor confirmation |
| GET | /api/appointments/mine | Get the current patient's or doctor's appointments |
| DELETE | /api/appointments/:appointmentId | Cancel an upcoming pending or accepted appointment (patient only) |
| GET/PUT | /api/appointments/doctor/profile | View or update doctor specialty and bio (doctor only) |
| GET/PUT | /api/appointments/doctor/availability | Read or replace weekly availability windows (doctor only) |
| GET/POST | /api/appointments/doctor/slots | List or publish one-time 30-minute appointment times (doctor only) |
| DELETE | /api/appointments/doctor/slots/:slotId | Remove an unbooked time (doctor only) |
| PATCH | /api/appointments/:appointmentId/status | Accept or decline a request (doctor only) |

Video consultations use the authenticated WebRTC call flow and are available
20 minutes before until 60 minutes after the scheduled start.

When deploying patient cancellation to a database that already has the old
unique `doctor_1_startsAt_1` index, drop that index once before restarting the
backend. The updated partial unique index lets cancelled or declined times be
booked again while still preventing duplicate active bookings.

### News feed (authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/feed | Get the latest 100 posts |
| POST | /api/feed | Create a post with optional `text` and `image` (`multipart/form-data`) |
| POST | /api/feed/:postId/likes | Toggle the current user's like |
| POST | /api/feed/:postId/comments | Add a comment using a JSON `text` field |
| POST | /api/feed/:postId/shares | Record a share |

Posts can contain text (up to 2000 characters), an image, or both. Images may
be JPG, PNG, WEBP, or GIF, up to 5 MB. The frontend share action uses the
browser's native share sheet when available, otherwise it copies a feed link.

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
