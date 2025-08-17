
# Arvox Hono API Boilerplate

Modern backend starter powered by Hono, Drizzle ORM, OpenAPI, and React Query-ready frontend helpers.

---

## 🚀 Features
- **Hono**: Fast, modern TypeScript API framework
- **Drizzle ORM**: Type-safe SQL, migrations, and schema
- **OpenAPI 3.0**: Auto-generated docs, always in sync with your DB
- **Modular Handlers**: SOLID, extensible, per-table strategies
- **React Query Hooks**: Frontend hooks for CRUD, cool DX
- **Centralized Exports**: One import for all client/server helpers
- **/api/v1/**: All endpoints and docs are versioned and prefixed

---

## 🗂️ Project Structure

```
├── src/
│   ├── adapters/         # Core CRUD + OpenAPI generator
│   ├── client/           # React Query hooks, helpers, types
│   ├── db/               # Drizzle schema & db
│   ├── handlers/
│   │   ├── maps/         # Handler maps per table
│   │   ├── routes/       # Route registration (API/docs)
│   │   └── strategies/   # Per-table handler strategies
│   └── server/           # Server entrypoint, exports
├── drizzle/              # Migrations
├── package.json
├── README.md
└── ...
```

---

## 🛠️ Backend Usage

### 1. Install & Start the API
```bash
bun install
bun run dev
# or
npm install
npm run dev
```

### 2. Endpoints
All endpoints are prefixed with `/api/v1/`.

| Method | Path                        | Description                |
|--------|-----------------------------|----------------------------|
| GET    | /api/v1/:table              | List records               |
| GET    | /api/v1/:table/:id          | Get record by id           |
| POST   | /api/v1/:table              | Create record(s)           |
| PUT    | /api/v1/:table              | Update by id               |
| PATCH  | /api/v1/:table              | Partial update by id       |
| DELETE | /api/v1/:table              | Delete by id               |

- All input/output schemas are auto-generated from your Drizzle schema.
- Only the `userId` field is excluded from input payloads (for security).

### 3. OpenAPI & Docs
- **Swagger JSON**:   [http://localhost:3000/swagger](http://localhost:3000/api/v1/swagger)
- **Scalar UI Docs**: [http://localhost:3000/docs](http://localhost:3000/api/v1/docs)

---


## 🧑‍💻 Frontend Usage

### 1. Install Peer Dependencies
```bash
npm install @tanstack/react-query sonner
```

### 2. Import Hooks & Helpers
```ts
import {
	useGet, usePost, usePut, usePatch, useDelete,
	useRecords, useRecordAction, dbQuery, dbMutation,
	useLogin, useRegister, useForgotPassword, useResetPassword, useUpdateProfile, useDeleteAccount, useLogout
} from './src/client'
```

### 3. Example: Fetch & Mutate
```tsx
const { data, isLoading } = useGet('posts')
const mutation = usePost('posts')

// Create a post
mutation.mutate({ title: 'Hello', content: 'World' })
```

- All hooks are typed from your backend schema.
- All helpers return `{ success, data, ... }` for consistency.

---

### 4. Auth Hooks (Plug & Play)

All auth hooks are decoupled and accept your `authClient` as a parameter. You can use your own auth logic or provider.

#### Register (Sign Up)
```ts
import { useRegister } from './src/client'
import { RegisterPayload } from './src/client/config/auth.type'

const { register, isPending, error } = useRegister<RegisterPayload>(authClient, {
	onSuccess: () => { /* navigation or toast */ },
	onError: (err) => { /* error handling */ },
})
// Usage: register({ name, email, password })
```

#### Login
```ts
const { handleSubmit, isLoading } = useLogin({ authClient, onSuccess: () => { /* ... */ } })
// Usage: handleSubmit({ email, password })
```

#### Forgot Password
```ts
const { handleForgotPassword, pending } = useForgotPassword({ authClient, redirectTo: '/reset-password', onSuccess: () => { /* ... */ } })
// Usage: handleForgotPassword({ email })
```

#### Reset Password
```ts
const { handleResetPassword, pending } = useResetPassword(token, { authClient, onSuccess: () => { /* ... */ } })
// Usage: handleResetPassword({ password })
```

#### Update Profile
```ts
const { updateName, updateEmail, updateAvatar, isLoading } = useUpdateProfile({ authClient })
// Usage: updateName(name), updateEmail(email), updateAvatar(url)
```

#### Delete Account
```ts
const { handleDeleteAccount, isDeleting } = useDeleteAccount({ authClient, onSuccess: () => { /* ... */ } })
// Usage: handleDeleteAccount(password)
```

#### Logout
```ts
const { logout, isPending } = useLogout({ authClient, onSuccess: () => { /* ... */ } })
// Usage: logout()
```

---


### 5. Helpers pour opérations non-CRUD (actions métier)

#### useOperation (mutation/action)
Pour toute opération asynchrone non-CRUD (ex : envoi de magic link, vérification, etc.) :
```ts
import { useOperation } from './src/client/ helpers'

const { execute, pending } = useOperation(sendMagicLink, {
	onSuccess: () => { /* ... */ },
	onError: (err) => { /* ... */ }
})
// Usage : execute({ email })
```

#### useActionQuery (lecture/fetch)
Pour toute opération de lecture non-CRUD (ex : lookup, vérification, etc.) avec React Query :
```ts
import { useActionQuery } from './src/client/ helpers'

const { data, isLoading } = useActionQuery(['verifyOtp', otp], verifyOtp, { otp })
// Usage : data contient le résultat de verifyOtp({ otp })
```

---

### 6. File Service (Minio/S3)

You can use the `ArvoxFileService` for file uploads, downloads, and signed URLs. It is fully configurable and works with any S3-compatible backend (Minio, AWS S3, etc).

```ts
import { ArvoxFileService } from './src/adapters/generic-file.service'
const fileService = new ArvoxFileService({ folder: 'uploads' })
// fileService.upload(file), fileService.delete(id), fileService.getSignedUrl(id, ext)
```

---


## 🧩 Customization
- Add new tables in `src/db/schema.ts` (Drizzle syntax)
- Add per-table logic in `src/handlers/strategies/`
- Add custom endpoints in `src/handlers/routes/rest-routes.ts`
- **Exclude tables from CRUD & docs**: Pass `excludedTables` to `registerApiRoutes` and `generateOpenAPISpec` to hide tables (e.g. auth tables) from public API and OpenAPI docs.
  
	Example:
	```ts
	// src/index.ts
	registerApiRoutes(app, { excludedTables: ['users', 'sessions', 'accounts'] })
	// ...
	generateOpenAPISpec({ schema, excludedTables: ['users', 'sessions', 'accounts'] })
	```
- OpenAPI input exclusion: only `userId` is excluded by default (see `src/adapters/openapi.ts`)

---

## 📚 Reference
- [Hono](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [OpenAPI](https://swagger.io/specification/)
- [@tanstack/react-query](https://tanstack.com/query/latest)

---

## 📝 License
MIT
