# MERN Frontend — RHF + Yup, Redux Toolkit + RTK Query, MUI + Bootstrap (scoped)

A React (Vite) frontend boilerplate with:
- **Redux Toolkit + RTK Query** for state and API data-fetching/caching
- **React Hook Form + Yup** for dynamic, schema-based form validation
- **Login flow** (JWT stored in Redux + localStorage, protected routes)
- **Light/dark theming** via MUI's `ThemeProvider`, toggle persisted to localStorage
- **MUI and Bootstrap used together, safely isolated** — see below

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # point VITE_API_BASE_URL at your backend
npm run dev             # starts on http://localhost:3000
```

Pairs with the `backend/` project shared earlier (same repo family) — make sure that's running on the URL set in `.env`.

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
│   │   ├── authSlice.js  # user/token state, persisted to localStorage
│   │   ├── authApi.js    # login/register/getProfile RTK Query endpoints
│   │   ├── loginSchema.js # Yup schema for login form
│   │   └── LoginPage.jsx # MUI-based login screen wired with RHF + yupResolver
│   └── products/
│       ├── productsApi.js   # CRUD + bulk upload RTK Query endpoints
│       ├── productSchema.js # Yup schema for product form
│       ├── ProductForm.jsx  # Bootstrap-based form (RHF + yup), scoped
│       ├── ProductList.jsx  # Bootstrap table + modals, scoped
│       └── ProductsPage.jsx # Composes MUI layout + Bootstrap-scoped content
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
│   └── AppRoutes.jsx # Route table (public /login, protected /products)
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
2. On success, `setCredentials` stores `{ user, token }` in Redux + localStorage.
3. `apiSlice`'s `prepareHeaders` attaches `Authorization: Bearer <token>` to every subsequent request.
4. If any request returns 401, `apiSlice` dispatches a `forceLogout` action, clearing auth state.
5. `ProtectedRoute` redirects to `/login` (preserving the intended destination) whenever there's no token.

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
