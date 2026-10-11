# Self-service profile writes are JWT-only and keep the `files` domain optional

The user profile feature needs three writes any authenticated user may perform —
update own name/phone/avatar (`PATCH /users/me`), change own password
(`POST /auth/change-password`), and upload an avatar (`POST /files/avatar`) —
without holding `users.*` or `files.manage`. We decided each lives on its own
controller guarded by `JwtAuthGuard` alone: `ProfileController` in the users
module (registered before `UsersController` so `/users/me` is not captured by
`/users/:id`), `ChangePasswordController` in the auth module, and
`AvatarController` in the files module. The avatar is persisted as an
`avatarUrl` string column on `AppUser`, not a relation to `File`.

**Why:** `PermissionsGuard` is fail-closed — a controller route without
`@RequirePermission` metadata is rejected — and the default Viewer role has
neither `users.update` nor `files.manage`, so the admin controllers cannot be
reused. The obvious alternative for avatars, reusing `POST /files/upload`,
would fail for Viewer; the other alternative, importing `FilesService` into the
users module, would add an `identity → files` import edge, and since `identity`
is non-optional while `files` is optional, the manifest would permanently
un-disable the files domain. Keeping the avatar route inside the files domain
preserves that boundary; the cost is that avatar upload is unavailable when the
files domain is disabled.

**Consequences:** three new routes under existing manifest prefixes (no manifest
changes, but `pnpm lint:manifest` must stay green); replaced/removed avatar
files are not deleted in v1 (orphans accepted, cleanup is a follow-up in the
files domain); and profile reads stay on `GET /auth/me` — there is no
`GET /users/me`.
