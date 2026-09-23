# ERP

Multi-tenant ERP. This glossary fixes the vocabulary for tenant-configured
defaults and generated master-data codes, both introduced in
`docs/superpowers/specs/2026-09-22-form-defaults-auto-codes-design.md`.

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
