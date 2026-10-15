# MERN Frontend — RHF + Yup, Redux Toolkit + RTK Query, MUI + Bootstrap (scoped)

A React (Vite) frontend boilerplate with:
- **Redux Toolkit + RTK Query** for state and API data-fetching/caching
- **React Hook Form + Yup** for dynamic, schema-based form validation
- **Login flow** (short-lived access token in Redux memory, rotating HttpOnly refresh cookie)
- **Light/dark theming** via MUI's `ThemeProvider`, toggle persisted to localStorage
- **MUI and Bootstrap used together, safely isolated** — see below

## Setup

```bash
cd frontend
npm install
copy .env.example .env  # Windows; set the API URL and OAuth client IDs
npm run dev             # starts on http://localhost:3000
```

Pairs with the `backend/` project shared earlier (same repo family) — make sure that's running on the URL set in `.env`.
Set `VITE_GOOGLE_CLIENT_ID` and `VITE_MICROSOFT_CLIENT_ID` in `.env` to enable the corresponding sign-in buttons. The backend must be configured with the matching `GOOGLE_CLIENT_ID` and `MICROSOFT_CLIENT_ID`; see the backend README for provider registration details.

After signing in, use **Messages** to search for people and manage friend
requests. Regular users can message accepted friends; administrator accounts
can message any user. Administrators also see a **Admin** page for user roles
and account management, including creating administrator accounts. Incoming
messages show a notification with a shortcut to the Messages page. Promote the
first administrator using `npm run admin:promote -- admin@example.com` from
the backend directory; see the backend README.

Choose **Patient** or **Doctor** during signup; Admin is never a public signup
option. Doctors set a specialty, biography, and their own per-appointment INR
fee in the Doctor portal, then publish individual appointment times. Patients
can request video visits (online payment required) or clinic visits (online or
pay-at-clinic). Doctors accept or decline each request; paid requests are
refunded when declined. Configure Razorpay test/live keys only in the backend
environment to enable online checkout. Payments are per appointment rather
than recurring daily, weekly, or monthly subscriptions.

Use **Feed** in the navigation bar to publish a text or image post, like and
comment on posts, and share a post link. Image uploads must be JPG, PNG, WEBP,
or GIF and no larger than 5 MB.

The Messages page also supports one-to-one audio and video calls with online
chat peers. Calls need microphone/camera permission and a secure browser context
(HTTPS, or localhost during development). The built-in STUN server supports
common network setups; restrictive firewalls may require a TURN server.

## Folder Structure

```
src/
├── app/
│   ├── store.js         # Redux store (auth, theme, RTK Query API slice)
│   └── hooks.js          # useAppDispatch / useAppSelector
├── services/
│   └── apiSlice.js       # Base RTK Query setup: baseUrl, auth header injection, 401 handling
├── features/
│   ├── auth/
│   │   ├── authSlice.js  # in-memory user/access-token state
│   │   ├── authApi.js    # login/register/refresh/logout/getProfile endpoints
│   │   ├── loginSchema.js # Yup schema for login form
│   │   └── LoginPage.jsx # MUI-based login screen wired with RHF + yupResolver
│   ├── products/
│       ├── productsApi.js   # CRUD + bulk upload RTK Query endpoints
│       ├── productSchema.js # Yup schema for product form
│       ├── ProductForm.jsx  # Bootstrap-based form (RHF + yup), scoped
│       ├── ProductList.jsx  # Bootstrap table + modals, scoped
│       └── ProductsPage.jsx # Composes MUI layout + Bootstrap-scoped content
│   └── community/
│       ├── FeedPage.jsx      # News feed with image posts, likes, comments, and sharing
│       └── communityApi.js   # Feed and messaging RTK Query endpoints
├── components/
│   ├── common/           # Shared presentational components (add as needed)
│   ├── form/
│   │   ├── MuiFormField.jsx       # MUI TextField <-> RHF Controller bridge
│   │   └── BootstrapFormField.jsx # react-bootstrap Form.Control <-> RHF Controller bridge
│   └── layout/
│       ├── Navbar.jsx         # MUI AppBar with theme toggle + logout
│       └── ProtectedRoute.jsx # Redirects to /login if not authenticated
├── theme/
│   ├── muiTheme.js   # Light/dark MUI theme tokens (palette, typography, shape)
│   └── themeSlice.js # Redux slice for theme mode, persisted to localStorage
├── routes/
│   └── AppRoutes.jsx # Public auth routes and protected app routes
├── utils/
│   └── bootstrapPortalRoot.js # Helper for scoping react-bootstrap portals (Modal etc.)
├── App.jsx      # ThemeProvider + CssBaseline + Router
├── main.jsx     # ReactDOM root, Redux Provider
└── index.css    # Minimal global reset + .bootstrap-scope isolation boundary
```

## How MUI + Bootstrap coexist without conflicts

Running both UI libraries in one app normally causes problems: Bootstrap's Reboot
(global reset) restyles `body`, headings, buttons, forms, etc., which fights
with MUI's own baseline (`CssBaseline`) and component styles.

This project scopes Bootstrap's CSS so it **only applies inside elements with
the `.bootstrap-scope` class**, using a PostCSS transform:

**`postcss.config.js`** runs `postcss-prefix-selector` against every rule that
originates from the `bootstrap` package's CSS, rewriting e.g. `.btn` to
`.bootstrap-scope .btn`, and `body { ... }` to `.bootstrap-scope { ... }`.
MUI's CSS (emotion-generated, already namespaced like `.MuiButton-root`) and
`index.css` pass through untouched.

**Where it's used:**
- `ProductForm.jsx` and `ProductList.jsx` wrap their root in `<div className="bootstrap-scope">`
- Everything else (Navbar, Login, layout) is pure MUI and needs no wrapper

**One gotcha handled for you:** `react-bootstrap`'s `Modal` (and other overlay
components) render via a React portal directly into `<body>`, which would
escape the `.bootstrap-scope` wrapper. `index.html` includes a permanent
`#bootstrap-portal-root` element with the class already applied, and
`utils/bootstrapPortalRoot.js` exports a helper you pass to `container` on
any `Modal`/`Overlay`:

```jsx
import { getBootstrapPortalRoot } from '../../utils/bootstrapPortalRoot';

<Modal show={show} onHide={close} container={getBootstrapPortalRoot}>
  ...
</Modal>
```

If you add more react-bootstrap overlay components (Tooltip, Popover,
OverlayTrigger), give them the same `container` prop.

## Form validation pattern (RHF + Yup)

Two thin "bridge" components connect React Hook Form's `Controller` to each
UI library's input, so validation logic (Yup schemas) stays completely
UI-agnostic and reusable:

```jsx
// Yup schema — pure, no UI dependency
export const productSchema = yup.object({
  name: yup.string().required('Product name is required'),
  price: yup.number().typeError('Price must be a number').required().min(0)
});

// Usage with MUI
<MuiFormField name="email" control={control} label="Email" />

// Usage with Bootstrap
<BootstrapFormField name="name" control={control} label="Product name" />
```

Both bridges read `fieldState.error` from RHF and surface it as each
library's native error UI (MUI's `helperText`+`error`, Bootstrap's
`isInvalid`+`Form.Control.Feedback`). Swapping which library a form uses
means swapping the field component only — the schema and submit logic don't change.

## Auth flow

1. `LoginPage` submits credentials via `useLoginMutation` (RTK Query).
2. The API returns a 15-minute access token and sets a 7-day refresh token in an HttpOnly cookie.
3. `apiSlice` keeps the access token in Redux memory, sends it as a Bearer token, and includes credentials for the refresh cookie. The refresh token is never exposed to JavaScript.
4. On access-token expiry, `apiSlice` rotates the refresh token and retries the original request. A refresh cookie is also checked when the app starts.
5. Logout revokes the refresh session. Access tokens are not persisted to `localStorage`.
6. MUI circular progress/backdrop indicators show loading states, and MUI snackbars show authentication success and error messages.
7. Google and Microsoft sign-in return provider ID tokens to the backend, which verifies the signature and audience before creating or authenticating a provider account.

## Theming

Theme mode lives in Redux (`themeSlice`) and is persisted to `localStorage`,
defaulting to the OS-level `prefers-color-scheme` on first load.
`App.jsx` rebuilds the MUI theme object (`getMuiTheme(mode)`) whenever mode
changes and feeds it to `ThemeProvider`. Toggle it from the Navbar's
sun/moon icon button.

## Extending this

- Add more RTK Query endpoints by calling `apiSlice.injectEndpoints(...)` in a new `features/<name>/xApi.js` file — no need to touch `apiSlice.js` itself.
- Add more forms by writing a Yup schema + reusing `MuiFormField` or `BootstrapFormField`.
- Add a bulk-upload UI (drag-and-drop CSV/Excel) hitting the backend's `/api/upload/bulk` — `useBulkUploadProductsMutation` is already defined in `productsApi.js`, just needs a `<Form.Control type="file">` wired to a submit handler that builds a `FormData` object.
