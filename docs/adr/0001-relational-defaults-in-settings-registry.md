# Relational tenant defaults live in the settings registry as reference-typed keys

The settings registry was documented as "scalar preferences only; relational
defaults (base currency, default sequences) are typed FK columns on Tenant". We
have decided to relax that: `defaultWarehouseId` and `defaultUnitId` are stored
as registry settings whose values are entity ids, with a `ref` marker on the
`SettingDef` so the API validates existence and tenancy on write and resolves
id → `{ id, code, name }` on read.

**Why:** these are tenant-configurable choices ("which warehouse/unit should
forms start from"), not structural relationships — they belong with the other
settings, in a UI the user already understands, and adding one needs no schema
migration. The `ref` marker keeps the integrity guarantee that a raw string key
would lose. The alternative, `Tenant.defaultWarehouseId` / `defaultUnitId` FK
columns, gives real referential integrity but spreads default configuration
across two homes and forces a migration per new default.

**Consequences:** the registry contract changes (`SettingCategory` gains
`defaults`, `SettingDef` gains `ref`); settings writes are no longer purely
synchronous; and reads must resolve ids, degrading a deleted reference to
`null` rather than erroring.
