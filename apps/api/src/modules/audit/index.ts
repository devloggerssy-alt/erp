/**
 * Public API of the audit domain. Other domains import from 'modules/audit'
 * only (Phase 7). Files inside audit must not import this barrel.
 */
export { AuditWriter, SYSTEM_USER_ID } from './audit-writer.service';
export type { AuditEntry, AuditTx } from './audit-writer.service';
