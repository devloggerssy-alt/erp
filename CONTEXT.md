# ERP

Multi-tenant ERP. This glossary fixes the vocabulary for tenant-configured
defaults and generated master-data codes
(`docs/superpowers/specs/2026-09-22-form-defaults-auto-codes-design.md`) and for
the user profile (`docs/superpowers/specs/2026-10-08-user-profile-design.md`).

## Language

**Form defaults**:
The resolved, tenant-specific set of values — fiscal period, currency,
warehouse, base unit, cashbox — returned by `GET /settings/defaults` and applied
to a creation form's empty fields.
_Avoid_: form prefill, initial data, seeds

**Default warehouse**:
The warehouse a tenant designates via settings to pre-fill warehouse fields on
creation forms.
_Avoid_: main warehouse, primary warehouse

**Default base unit**:
The unit a tenant designates via settings to pre-fill the base-unit field on
item creation forms; falls back to the first active unit when unset.
_Avoid_: default UoM, default unit of measure

**System-generated code**:
A master-data code (warehouse, cashbox, item, bank account) minted by the server
when the user leaves the code blank on creation.
_Avoid_: auto code, next code, sequential code

**Code sequence**:
The per-tenant, per-entity counter that backs system-generated codes.
_Avoid_: number sequence (reserved for `DocumentSequence`), document sequence

### Identity

**User profile**:
The authenticated user's own editable personal data — display name, phone, and
avatar — managed at `/[locale]/profile`. Distinct from the **Company profile**
(tenant-level settings at `/settings/company`) and from **User management** (the
admin CRUD over accounts and roles).
_Avoid_: account, my account, user settings

### AI agent

**Approval decision**:
The user's approve-or-reject answer to one pending write or destructive tool
call the assistant proposed.
_Avoid_: confirmation, consent

**Tool-call disposition**:
The outcome the agent assigns to one tool call the model proposed: run it, hold
it for an approval decision, or reject it as unknown, not permitted, or denied.
_Avoid_: tool-call plan, tool routing
