import { Prisma } from '@devloggers/db-prisma';
import { DATABASE_BACKUP_MODELS } from '../database-backup-models';

/**
 * Deliberately not backed up: AuditLog/OutboxEvent are history/transient
 * infra (see design spec §Model list). AiCheckpoint/AiCheckpointWrite are
 * LangGraph's binary conversation-replay state (a `Bytes` column each) —
 * not user-visible data, and restoring stale checkpoints into a remapped
 * tenant could point LangGraph at incoherent graph state. AiConversation/
 * AiMessage (the actual chat history, JSON-safe) ARE included below.
 */
const DELIBERATELY_EXCLUDED = new Set(['AuditLog', 'OutboxEvent', 'AiCheckpoint', 'AiCheckpointWrite']);
/** Scoped through a parent relation instead of their own tenantId column. */
const RELATION_SCOPED = new Set(['UserRole', 'RolePermission']);

describe('DATABASE_BACKUP_MODELS coverage', () => {
    it('declares every tenant-scoped Prisma model exactly once', () => {
        const directlyScoped = Prisma.dmmf.datamodel.models
            .filter((model) => model.fields.some((field) => field.name === 'tenantId'))
            .map((model) => model.name)
            .filter((name) => !DELIBERATELY_EXCLUDED.has(name));

        const expected = new Set([...directlyScoped, ...RELATION_SCOPED]);
        const declared = DATABASE_BACKUP_MODELS.map((spec) => spec.model);

        expect(new Set(declared)).toEqual(expected);
        expect(declared).toHaveLength(expected.size);
        expect(new Set(declared).size).toBe(declared.length); // no duplicates
    });

    it('marks UserRole and RolePermission as relation-scoped, not tenantId-scoped', () => {
        const userRole = DATABASE_BACKUP_MODELS.find((spec) => spec.model === 'UserRole');
        const rolePermission = DATABASE_BACKUP_MODELS.find((spec) => spec.model === 'RolePermission');

        expect(userRole?.scopeViaRelation).toBe('user');
        expect(rolePermission?.scopeViaRelation).toBe('role');
    });

    it('marks the three hierarchy models and JournalEntry as self-referencing', () => {
        const selfRef = (name: string) =>
            DATABASE_BACKUP_MODELS.find((spec) => spec.model === name)?.selfReferenceField;

        expect(selfRef('ChartOfAccount')).toBe('parentId');
        expect(selfRef('ItemCategory')).toBe('parentId');
        expect(selfRef('CatalogEntity')).toBe('parentId');
        expect(selfRef('JournalEntry')).toBe('reversalOfId');
    });
});
