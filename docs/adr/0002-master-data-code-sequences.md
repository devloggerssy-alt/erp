# Master-data codes use a dedicated CodeSequence, not DocumentSequence

Master-data codes (warehouse, cashbox, item, bank account) are minted from a new
per-tenant `CodeSequence(entity)` table with a hardcoded prefix and 4-digit
padding, rather than reusing `DocumentSequence`.

**Why:** `DocumentSequence` is user-facing and document-semantic — its rows are
editable through the document-sequences CRUD module and carry prefixes like
`SAL`/`PUR`/`JE` that map to document types. Overloading it with catalog
counters would surface master-data sequences in that UI and couple two unrelated
lifecycles. A separate table keeps the counters atomic and out of the way. The
obvious-but-wrong alternative was `max(code) + 1`, which races under concurrent
creates.

**Consequences:** a new table and migration; four resource services depend on a
shared allocator; and existing manually-entered codes coexist with generated
ones (generation only fires when `code` is omitted).
