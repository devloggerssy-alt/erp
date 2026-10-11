# User Profile Page — Design

**Date:** 2026-10-08
**Author:** opencode
**Status:** Draft
**Scope:** Dashboard `/[locale]/profile` + API `PATCH /users/me`, `POST /auth/change-password`, `POST /files/avatar` + `AppUser.avatarUrl`
**Primary goal:** Let every authenticated user view and update their own profile (name, phone, avatar) and change their password, without touching admin user management.

---

## Context

- The dashboard header already links to `/{locale}/profile` — a dead route (`apps/dashboard/infrastructure/components/layout/dashboard/dashboard-header.tsx:184`). `system.header.profile` exists in all three locales.
- `AppUser` (`packages/db-prisma/src/schema/user.prisma`) has `fullName`, `phone`, `email`, `passwordHash` — **no avatar field**. `File` has no owner/uploader relation. Image precedent: `imageUrl String?` columns on `ItemCategory` / `Brand`.
- `GET /auth/me` (JWT-only, `apps/api/src/modules/identity/auth/auth.controller.ts:94`) returns `phone` + roles/permissions/tenant. `AuthService.getMe` (`auth.service.ts:154`) builds it.
- Admin user CRUD lives in `apps/api/src/modules/identity/users/` (`users.controller.ts`), all guarded by `JwtAuthGuard, PermissionsGuard` with `users.*` permissions.
- Upload infra exists (`apps/api/src/modules/files/`): `POST /files/upload` (local/S3 via `FilesService.upload`, `files.service.ts:23`), but it requires `files.manage` — **Viewer role does not have it** (`packages/api-contracts/src/permissions/default-role-permissions.ts:110`).
- `PermissionsGuard` is fail-closed: a route without `@RequirePermission` metadata under a class-guarded controller throws `ForbiddenException` (`apps/api/src/modules/identity/auth/guards/permissions.guard.ts:31-33`). Method-level `@UseGuards` does not remove class-level guards in Nest. Self-service routes therefore need **controllers without the class-level `PermissionsGuard`**.
- `identity` is a non-optional domain; `files` is optional (`apps/api/src/domain/manifest.ts`). Making `identity` import `FilesService` would make `files` effectively mandatory.
- Dashboard user state: zustand `useAuthStore` seeded from the non-httpOnly `auth_user` cookie (`shared/stores/auth-store.ts`), header reads `useAuth()`; `refreshUserCookie()` server action exists (`modules/auth/auth.actions.ts:64`). No react-query entry for the current user today.
- Singleton form pattern exists: `useSettingsSection` + `SettingsSectionCard` (`modules/settings/hooks/use-settings-section.ts`); upload field exists: `RhfImageField`/`ImageInputField` + `useFileUpload` (`shared/hooks/use-file-upload.ts`).
- Related docs: `CONTEXT.md`, ADR `docs/adr/0003-self-service-profile-writes-are-jwt-only.md`, ADR `docs/adr/0004-password-change-keeps-existing-sessions.md`.
- Decisions settled in grilling round 1 (all approved 2026-10-08) — see "Design decisions" below.

---

## Design decisions (grilling round 1)

| # | Decision |
|---|----------|
| Q1 | Profile update = `PATCH /users/me` (JWT-only, no permission), own `ProfileController` in the users module, payload `{ fullName?, phone?, avatarUrl? }`. No `GET /users/me` — `GET /auth/me` remains the read path. |
| Q2 | Password change = `POST /auth/change-password` (JWT-only), dedicated controller + service, payload `{ currentPassword, newPassword }`. Confirm field is client-side only. |
| Q3 | Avatar upload = `POST /files/avatar` (JWT-only, files domain), image-only, size-limited, forced folder `avatars/<userId>`. `identity` gains no dependency; `files` stays optional. |
| Q4 | Avatar stored as `avatarUrl String?` on `AppUser` (URL string, matching the `ImageUrl` precedent). No FK to `File`. |
| Q5 | Editable fields: `fullName` (required), `phone` (optional), `avatar` (upload/remove). Email is read-only display; roles/tenant display-only; all auth fields rejected server-side by the whitelist. |
| Q6 | Password change does **not** revoke existing sessions (stateless 24h JWT, no token versioning). Recorded in ADR 0004. |
| Q7 | Dashboard: `/[locale]/profile` under `(authenticated)`, new `modules/profile/`; profile card + separate "Change password" button opening a dialog. Not added to sidebar nav. |
| Q8 | Data/invalidation: page uses react-query key `["auth","me"]`; on either mutation success → `invalidateQueries(["auth","me"])` + `refreshUserCookie()` + `useAuthStore.hydrate()` so header name/avatar update. |
| Q9 | No automatic deletion of replaced avatars in v1 (orphan files accepted; sweep is follow-up). Remove-avatar = clear the field → `avatarUrl: null` on save. |
| Q10 | Docs: this spec + glossary term + ADRs 0003/0004. Tests: API jest specs + dashboard vitest config/schema tests; Cypress e2e out of scope. |

---

## Requirements

### Functional

- [ ] `PATCH /users/me` updates only `fullName`, `phone`, `avatarUrl` for the requesting user (tenant-scoped, JWT-only). `email`, `password`, `isActive`, `roleIds` in the payload are rejected (global `whitelist` + `forbidNonWhitelisted`).
- [ ] `POST /auth/change-password` verifies `currentPassword` with bcrypt; on mismatch → 400; `newPassword` min 8 chars, must differ from current; success re-hashes with `BCRYPT_SALT_ROUNDS`.
- [ ] `POST /files/avatar` accepts a single image file from any authenticated user; validates MIME against `IMAGE_MIME_TYPES` and size against `FILE_SIZE_LIMITS.IMAGE` (10 MB) for both local and S3 storage; stores under `avatars/<userId>` and returns `{ url, ... }`.
- [ ] Dashboard `/profile` page:
  - Avatar uploader with preview and clear (remove) control.
  - Full name (required), phone (optional), email shown read-only.
  - Save button; success toast; error toast / field errors.
  - Separate "Change password" button opening a dialog (current, new, confirm).
- [ ] After profile save or password change: query `["auth","me"]` invalidated; `auth_user` cookie refreshed; header name/avatar update without reload.
- [ ] Header dropdown renders the avatar image (`AvatarImage`) when `avatarUrl` is set, initials fallback otherwise.
- [ ] Email is never editable client- or server-side; password is never part of profile payloads.

### Non-functional

- [ ] Tenant isolation: profile update matches `id` + `tenantId`; avatar path is prefixed with the caller's `tenantId`.
- [ ] `identity` domain gains no new cross-domain dependency; `files` remains optional; no `manifest.ts` changes required (routes stay under existing prefixes `users`, `auth`, `files`).
- [ ] i18n: en, ar, tr (`packages/i18n/src/<locale>/system.json`, `system.profile.*`).
- [ ] RTL-safe UI (logical CSS).
- [ ] OpenAPI decorators on all new routes; registry regenerated (`pnpm generate:dev` with API running).
- [ ] No new runtime dependencies.
- [ ] Route ordering: `ProfileController` registered in `UsersModule` before `UsersController` so `PATCH /users/me` is not captured by `PATCH /users/:id`.

### Backend payload / API

| Route | Guard | Request | Response |
|-------|-------|---------|----------|
| `PATCH /users/me` | `JwtAuthGuard` only | `UpdateProfileDto { fullName?: string (non-empty); phone?: string \| null; avatarUrl?: string \| null }` | `ProfileResponseDto { id, email, fullName, phone, avatarUrl }` |
| `POST /auth/change-password` | `JwtAuthGuard` only | `ChangePasswordDto { currentPassword: string; newPassword: string (min 8) }` | `null` (200) |
| `POST /files/avatar` | `JwtAuthGuard` only | multipart `file` (image/*, ≤ 10 MB) | `File` metadata incl. `url` |

- `GET /auth/me` and login additionally return `avatarUrl` (`AuthUserDto`, `MeDataDto`, `AuthService.buildAuthUser`/`getMe`).
- Wrong current password → `400 Bad Request` (`Current password is incorrect`); new equals current → `400` (`New password must be different from the current password`).

---

## UX requirements

- Profile page is a singleton settings-style card (not a resource list): no pagination, no dialog for profile fields.
- Avatar: rectangle dropzone (`RhfImageField`) accepted as-is; the X button clears the value (remove on save).
- Password dialog: opened only via its own button; fields `currentPassword`, `newPassword`, `confirmNewPassword`; client validation (min 8, match, different from current); submit closes dialog + resets on success; errors stay in dialog.
- Loading states: disabled inputs / spinner while `isBusy`; save button label switches Saving….
- Read-only email field rendered disabled with a helper text; no password fields on the profile card.

---

## Proposed approach

### Option A (recommended) — adopted

Dedicated self-service controllers that skip the fail-closed `PermissionsGuard`:

1. **Prisma**: add `avatarUrl String? @map("avatar_url")` to `AppUser`; migration `add_user_avatar_url`.
2. **API**:
   - `ProfileController` (`@Controller('users')`, `@UseGuards(JwtAuthGuard)`) + `ProfileService` + `UpdateProfileDto`/`ProfileResponseDto` in the users module; registered first in `UsersModule.controllers`.
   - `change-password/` folder in the auth module: `ChangePasswordController` (`@Controller('auth')`, `@UseGuards(JwtAuthGuard)`), `ChangePasswordService`, `ChangePasswordDto`.
   - `AvatarController` (`@Controller('files')`, `@UseGuards(JwtAuthGuard)`) in the files module; `FilesService.uploadAvatar(file, tenantId, userId)` validates then reuses `upload(file, \`avatars/${userId}\`, tenantId)`.
   - `AuthService`/DTOs expose `avatarUrl` on the me/login payload.
3. **Contracts/client**: routes added to `auth.resource.ts` (`changePassword`) and `user.resource.ts` (`me`); `AuthClient.changePassword()`, `UsersClient.updateMe()`; `AuthUser` gains `phone` and `avatarUrl`; regenerate OpenAPI types.
4. **Dashboard**: `modules/profile/` (config, page, form, dialog, avatar upload hook); thin route page; header renders `AvatarImage`.
5. **Invalidation**: reuse `useSettingsSection` with a new optional `onSuccess` callback → `invalidateQueries(["auth","me"])` + `refreshUserCookie()` + store `hydrate()`.

**Why this option:**

- Works for every role (Viewer included) without widening `files.manage`.
- Keeps `identity` free of a `files` dependency, so the optional `files` domain stays disableable (ADR 0003).
- Reuses existing patterns: singleton settings form, `ImageInputField`, storage abstraction, `MeDataDto` shape for reads.

### Option B (rejected) — reuse `POST /files/upload`

Requires `files.manage`; Viewer could not change an avatar. Granting it to all roles pollutes the permission model for one endpoint.

### Option C (rejected) — `users` module imports `FilesService`

Adds an import edge `identity → files`; `files` (optional) could then never be disabled because non-optional `identity` depends on it; manifest drift check would require updating `dependsOn`.

### Option D (rejected) — `tokenVersion` session revocation

Cross-cutting auth change (JWT payload, strategy, every login) out of proportion for this feature; see ADR 0004.

---

## Data flow

```mermaid
sequenceDiagram
    participant UI as Dashboard /profile
    participant API as NestJS
    participant DB as PostgreSQL
    participant ST as Storage (local/S3)

    Note over UI,ST: Avatar upload (before save)
    UI->>API: POST /files/avatar (multipart)
    API->>API: validate image type + size
    API->>ST: store file
    API->>DB: INSERT files
    API-->>UI: { url }

    Note over UI,DB: Profile save
    UI->>API: PATCH /users/me { fullName, phone, avatarUrl }
    API->>DB: UPDATE app_users WHERE id AND tenant_id
    DB-->>API: updated row
    API-->>UI: ProfileResponseDto
    UI->>UI: invalidate ["auth","me"] + refreshUserCookie + store.hydrate
    UI->>API: GET /auth/me (refetch)
    API-->>UI: MeDataDto (incl. avatarUrl) — header updates

    Note over UI,DB: Change password
    UI->>API: POST /auth/change-password { currentPassword, newPassword }
    API->>DB: SELECT password_hash; bcrypt.compare; UPDATE password_hash
    API-->>UI: 200 → dialog closes
```

---

## File map

### Create

| Path | Purpose |
|------|---------|
| `apps/api/src/modules/identity/users/profile.controller.ts` | `PATCH /users/me`, JWT-only, registered before `UsersController` |
| `apps/api/src/modules/identity/users/profile.service.ts` | Self-service update (tenant-scoped, whitelisted fields) |
| `apps/api/src/modules/identity/users/dto/profile.dto.ts` | `UpdateProfileDto`, `ProfileResponseDto` |
| `apps/api/src/modules/identity/users/profile.service.spec.ts` | Service unit tests |
| `apps/api/src/modules/identity/auth/change-password/change-password.controller.ts` | `POST /auth/change-password`, JWT-only |
| `apps/api/src/modules/identity/auth/change-password/change-password.service.ts` | Verify + hash + update |
| `apps/api/src/modules/identity/auth/change-password/change-password.dto.ts` | `ChangePasswordDto` |
| `apps/api/src/modules/identity/auth/change-password/change-password.service.spec.ts` | Unit tests (wrong/same/valid) |
| `apps/api/src/modules/files/avatar.controller.ts` | `POST /files/avatar`, JWT-only, image validation |
| `apps/api/src/modules/files/files.service.spec.ts` | `uploadAvatar` validation: non-image/oversize rejected, folder delegation |
| `apps/dashboard/app/[locale]/(authenticated)/profile/page.tsx` | Thin route → `<ProfilePage />` |
| `apps/dashboard/modules/profile/index.ts` | Barrel |
| `apps/dashboard/modules/profile/profile.config.ts` | Zod schema, defaults, `mapUserToProfileValues`, `toUpdateProfile` |
| `apps/dashboard/modules/profile/profile.config.test.ts` | Mapper/schema tests (vitest) |
| `apps/dashboard/modules/profile/components/profile-page.tsx` | Card + save form + change-password button/dialog |
| `apps/dashboard/modules/profile/components/profile-form.tsx` | RHF fields (avatar, fullName, phone, read-only email) |
| `apps/dashboard/modules/profile/components/change-password-dialog.tsx` | Dialog + own schema/mutation |
| `apps/dashboard/modules/profile/hooks/use-avatar-upload.ts` | `postFormData('/files/avatar')` → url |
| `docs/adr/0003-self-service-profile-writes-are-jwt-only.md` | ADR |
| `docs/adr/0004-password-change-keeps-existing-sessions.md` | ADR |

### Modify

| Path | Change |
|------|--------|
| `packages/db-prisma/src/schema/user.prisma` | `avatarUrl String? @map("avatar_url")` |
| `packages/api-contracts/src/dto/auth.dto.ts` | `AuthUser` + `phone`/`avatarUrl`; `ChangePasswordDto` |
| `packages/api-contracts/src/dto/user.dto.ts` | `UpdateProfileDto`, `ProfileResponseDto` |
| `packages/api-contracts/src/resources/auth.resource.ts` | `changePassword: '/auth/change-password'` |
| `packages/api-contracts/src/resources/user.resource.ts` | `me: '/users/me'` |
| `packages/api-client/src/clients/auth.client.ts` | `changePassword()` |
| `packages/api-client/src/clients/users.client.ts` | `updateMe()` |
| `apps/api/src/modules/identity/users/users.module.ts` | `controllers: [ProfileController, UsersController]`, `ProfileService` |
| `apps/api/src/modules/identity/users/dto/index.ts` | Export profile DTOs |
| `apps/api/src/modules/identity/users/repositories/users.repository.ts` | `updateUser` accepts `avatarUrl`/nullable `phone`; add to `userSelect` where relevant |
| `apps/api/src/modules/identity/auth/auth.module.ts` | Register change-password controller/service |
| `apps/api/src/modules/identity/auth/auth.service.ts` | `avatarUrl` in `buildAuthUser` + `getMe` |
| `apps/api/src/modules/identity/auth/dto/auth-response.dto.ts` | `avatarUrl` on `AuthUserDto` |
| `apps/api/src/modules/files/files.module.ts` | Register `AvatarController` |
| `apps/api/src/modules/files/files.service.ts` | `uploadAvatar()` (validate + delegate to `upload`) |
| `apps/dashboard/shared/hooks/use-settings-section.ts` | Moved from `modules/settings/hooks/` (generic singleton-form hook) + optional `onSuccess` callback |
| `apps/dashboard/infrastructure/components/layout/dashboard/dashboard-header.tsx` | `AvatarImage` with `resolveMediaUrl(user.avatarUrl)` |
| `packages/i18n/src/en/system.json`, `ar/system.json`, `tr/system.json` | `system.profile.*` keys |
| `apps/api/openapi.yaml`, `packages/api-contracts/types/index.ts` | Regenerated (`pnpm generate:dev`) |
| `CONTEXT.md` | Glossary term "User profile" |

### Delete

None.

---

## Layer details

### 1. Database

- `AppUser.avatarUrl String? @map("avatar_url")`.
- Migration `add_user_avatar_url` (generated via `pnpm --filter @devloggers/db-prisma db:migrate:dev`); no index needed (single-column read by id).
- No changes to `File` (still metadata-only; URL stored on `AppUser`).

### 2. API contracts

- `userResource.routes.me = '/users/me' as ApiPath` (extra route on the CRUD resource, same style as units' `export`/`import`).
- `authResource.routes.changePassword = '/auth/change-password' as ApiPath`.
- Hand-written mirrors: `UpdateProfileDto`, `ProfileResponseDto`, `ChangePasswordDto`; `AuthUser` gains `phone?: string | null`, `avatarUrl?: string | null`.
- `packages/api-contracts/types/index.ts` regenerated from Swagger; never hand-edited.

### 3. NestJS API

- **`ProfileController`** — `@ApiTags('Users')`, `@Controller('users')`, class `@UseGuards(JwtAuthGuard)` only (no `PermissionsGuard` — fail-closed would reject). Declared **before** `UsersController` in `UsersModule.controllers` so `/users/me` is not captured by `/users/:id`.
- **`ProfileService`** — `updateMe(tenantId, userId, dto)`: `usersRepository.findByIdInTenant` (tenant scoping + 404), then `updateUser(userId, { fullName, phone, avatarUrl })`; maps to `ProfileResponseDto`. Uses only whitelisted fields — email/password are not in the DTO.
- **`ChangePasswordController`/`Service`** — loads `passwordHash` by `userId`, `bcrypt.compare(currentPassword, hash)`; invalid → `BadRequestException`; equal new/current → `BadRequestException`; hashes `newPassword` with `BCRYPT_SALT_ROUNDS` (default 10, as in `users.service.ts:31`); `prisma.appUser.update`. No events/audit in v1.
- **`AvatarController`** — `@Post('avatar')`, `FileInterceptor('file', { storage: multer.memoryStorage(), limits: { fileSize: FILE_SIZE_LIMITS.IMAGE } })`, no `folder` body; calls `FilesService.uploadAvatar(file, user.tenantId, user.id)`; response `ApiResponseBuilder.success(file, 'Avatar uploaded')`.
- **`FilesService.uploadAvatar`** — reject non-`IMAGE_MIME_TYPES` with `BadRequestException` (applies to both storage providers, unlike the current S3-only check); delegate to `upload(file, \`avatars/${userId}\`, tenantId)`.
- **`AuthService`** — `buildAuthUser` and `getMe` include `avatarUrl` (and `getMe` keeps `phone`).
- Route manifest: no changes (`users`, `auth`, `files` prefixes already owned by `identity`/`files`). `pnpm lint:manifest` must pass.

### 4. API client

- `AuthClient.changePassword(payload: ApiRequestBody<typeof authResource.routes.changePassword, 'post'>)`.
- `UsersClient.updateMe(payload: ApiRequestBody<typeof userResource.routes.me, 'patch'>)`.
- Avatar upload goes through the existing raw helper `api.client.postFormData('/files/avatar', formData)` (same style as `useFileUpload`), no resource entry required.

### 5. Dashboard

- **`profile.config.ts`** — zod: `fullName: string().trim().min(1)`, `phone: string().optional()`, `avatarUrl: string().nullable().optional()`; `mapUserToProfileValues(user)` (nulls → empty strings); `toUpdateProfile(values)` (empty phone → `null`).
- **`profile-page.tsx`** — `useMeQuery`-equivalent via `useSettingsSection` (`queryKey: ["auth","me"]`, `load: () => mapUserToProfileValues(unwrapApiData(await api.auth.me()))`, `submit: (v) => api.users.updateMe(toUpdateProfile(v))`); header of the card has the separate "Change password" button (opens `ChangePasswordDialog`); on success: `invalidateQueries(["auth","me"])` + `refreshUserCookie()` + `useAuthStore.getState().hydrate()` (wired through the new `onSuccess` option).
- **`profile-form.tsx`** — `RhfImageField` (avatar, `onUpload` from `useAvatarUpload`), `RhfInputField` fullName/phone, disabled email field, `ResourceFormShell`-style submit via the controller.
- **`change-password-dialog.tsx`** — shadcn `Dialog` + own RHF/zod (`newPassword.min(8)`, `confirm` matches, differs from current); submit calls `api.auth.changePassword`; `toast.promise`; closes + resets on success; `invalidateQueries(["auth","me"])` on success.
- **`use-avatar-upload.ts`** — posts `FormData` to `/files/avatar`, `unwrapApiData` → `url`; failure surfaces the existing upload-field toast.
- **Header** — `Avatar` gains `AvatarImage src={resolveMediaUrl(user?.avatarUrl ?? undefined)}`; fallback stays initials.
- **i18n** — `system.profile.*`: title, description, avatar, fullName, email (+ read-only hint), phone, save/saving/saved/saveFailed, changePassword, dialog strings (current/new/confirm, min length, mismatch, same-as-current, updated, updateFailed), removeAvatar hint.
- Email is rendered from `useAuth()`/me data, never submitted.

---

## Verification

```bash
pnpm --filter @devloggers/db-prisma db:migrate:dev
pnpm turbo run build --filter=@devloggers/api
pnpm generate:dev                 # API must be running — regenerates openapi + contracts types
pnpm turbo run build --filter=@devloggers/api-contracts
pnpm turbo run build --filter=@devloggers/api-client
pnpm turbo run build --filter=@devloggers/dashboard
pnpm --filter @devloggers/api test
pnpm --filter @devloggers/dashboard test:unit
pnpm lint:manifest
```

### Manual smoke test

- [ ] `/en/profile` loads for Owner **and** Viewer (no `users.*`/`files.manage` needed).
- [ ] Full name + phone save; header name updates without reload.
- [ ] Avatar uploads, previews, appears in header; clear + save removes it (`avatarUrl: null`).
- [ ] Sending `email` or `password` in `PATCH /users/me` → 400 (whitelist).
- [ ] Wrong current password → 400 in dialog; correct → closes; re-login with new password works.
- [ ] Viewer hitting `/settings/users` still forbidden (admin CRUD unchanged).
- [ ] ar (RTL) and tr render the page; dialog and form layout intact.
- [ ] Disabled `files` domain deployment: profile still loads; avatar upload shows an error toast.

---

## Out of scope

- Session revocation / `tokenVersion` after password change (ADR 0004).
- Orphan avatar file cleanup (delete-on-replace; files-domain sweep) — follow-up.
- Email change, forgot/reset password, email delivery.
- Avatar cropping/resizing/compression.
- Admin user management changes (`settings/users` page untouched).
- Cypress e2e for the profile page (repo `settings.cy.ts` pattern available if wanted later).

---

## Open questions

- [x] All functional decisions settled in grilling round 1 (2026-10-08), approved by user.
- [ ] ar/tr copy review by a native speaker — **Decision:** ship best-effort translations, adjust later.

---

## Approval

- [ ] Design reviewed by: ___
- [ ] Approved on: ___
