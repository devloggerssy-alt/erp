# Password change keeps existing sessions valid

Changing the password (`POST /auth/change-password`) updates only the stored
hash; it does not invalidate previously issued JWTs. A token obtained before the
change remains valid until its 24-hour expiry.

**Why:** access is stateless JWT with no refresh tokens, no session store, and
no token versioning. Revoking other sessions would require a `tokenVersion` on
`AppUser`, embedding it in the payload, and checking it in the strategy/guards —
a cross-cutting auth change disproportionate to this feature. The trade-off is
knowingly accepted: a leaked token keeps working for at most 24 hours after a
password change.

**Consequences:** if session revocation becomes a requirement, it needs its own
cross-cutting spec (token versioning or a session store); until then, this is
deliberate, not an oversight.
