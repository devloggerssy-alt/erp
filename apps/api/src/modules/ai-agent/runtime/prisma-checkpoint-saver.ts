import { Injectable } from '@nestjs/common';
import { PrismaService } from '@devloggers/db-prisma/nest';
import type { Prisma } from '@devloggers/db-prisma';
import type { RunnableConfig } from '@langchain/core/runnables';
import {
    BaseCheckpointSaver,
    WRITES_IDX_MAP,
    type ChannelVersions,
    type Checkpoint,
    type CheckpointListOptions,
    type CheckpointMetadata,
    type CheckpointPendingWrite,
    type CheckpointTuple,
    type PendingWrite,
} from '@langchain/langgraph-checkpoint';

type Configurable = { thread_id?: string; checkpoint_ns?: string; checkpoint_id?: string; tenant_id?: string };

function configurable(config: RunnableConfig): Configurable {
    return (config.configurable ?? {}) as Configurable;
}

function requireThread(c: Configurable): string {
    if (!c.thread_id) throw new Error('PrismaCheckpointSaver: configurable.thread_id is required');
    return c.thread_id;
}

function requireTenant(c: Configurable): string {
    if (!c.tenant_id) throw new Error('PrismaCheckpointSaver: configurable.tenant_id is required');
    return c.tenant_id;
}

/**
 * LangGraph checkpointer on Prisma so the tables come from a Prisma migration
 * (".ai/rules/monorepo.md: DB changes via Prisma migrations only").
 * Checkpoint ids are uuid6 (time-ordered), so lexical order = chronological order.
 */
@Injectable()
export class PrismaCheckpointSaver extends BaseCheckpointSaver {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
        const c = configurable(config);
        const threadId = requireThread(c);
        const checkpointNs = c.checkpoint_ns ?? '';
        const row = c.checkpoint_id
            ? await this.prisma.aiCheckpoint.findUnique({
                  where: { threadId_checkpointNs_checkpointId: { threadId, checkpointNs, checkpointId: c.checkpoint_id } },
              })
            : await this.prisma.aiCheckpoint.findFirst({
                  where: { threadId, checkpointNs },
                  orderBy: { checkpointId: 'desc' },
              });
        if (!row) return undefined;

        const writes = await this.prisma.aiCheckpointWrite.findMany({
            where: { threadId, checkpointNs, checkpointId: row.checkpointId },
            orderBy: [{ taskId: 'asc' }, { idx: 'asc' }],
        });
        const pendingWrites: CheckpointPendingWrite[] = await Promise.all(
            writes.map(async (write): Promise<CheckpointPendingWrite> => [
                write.taskId,
                write.channel,
                await this.serde.loadsTyped(write.type, write.value),
            ]),
        );

        return {
            config: { configurable: { thread_id: threadId, checkpoint_ns: checkpointNs, checkpoint_id: row.checkpointId } },
            checkpoint: (await this.serde.loadsTyped(row.type, row.checkpoint)) as Checkpoint,
            metadata: row.metadata as CheckpointMetadata,
            parentConfig: row.parentCheckpointId
                ? { configurable: { thread_id: threadId, checkpoint_ns: checkpointNs, checkpoint_id: row.parentCheckpointId } }
                : undefined,
            pendingWrites,
        };
    }

    async *list(config: RunnableConfig, options?: CheckpointListOptions): AsyncGenerator<CheckpointTuple> {
        const c = configurable(config);
        const threadId = requireThread(c);
        const before = options?.before ? configurable(options.before).checkpoint_id : undefined;
        const rows = await this.prisma.aiCheckpoint.findMany({
            where: {
                threadId,
                ...(c.checkpoint_ns !== undefined ? { checkpointNs: c.checkpoint_ns } : {}),
                ...(before ? { checkpointId: { lt: before } } : {}),
            },
            orderBy: { checkpointId: 'desc' },
            ...(options?.limit ? { take: options.limit } : {}),
        });
        for (const row of rows) {
            if (options?.filter) {
                const metadata = row.metadata as Record<string, unknown>;
                const matches = Object.entries(options.filter).every(([key, value]) => metadata[key] === value);
                if (!matches) continue;
            }
            const tuple = await this.getTuple({
                configurable: { thread_id: threadId, checkpoint_ns: row.checkpointNs, checkpoint_id: row.checkpointId },
            });
            if (tuple) yield tuple;
        }
    }

    async put(
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        _newVersions: ChannelVersions,
    ): Promise<RunnableConfig> {
        const c = configurable(config);
        const threadId = requireThread(c);
        const tenantId = requireTenant(c);
        const checkpointNs = c.checkpoint_ns ?? '';
        const [type, bytes] = await this.serde.dumpsTyped(checkpoint);
        const data = {
            parentCheckpointId: c.checkpoint_id ?? null,
            tenantId,
            type,
            checkpoint: Buffer.from(bytes),
            metadata: JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue,
        };
        await this.prisma.aiCheckpoint.upsert({
            where: { threadId_checkpointNs_checkpointId: { threadId, checkpointNs, checkpointId: checkpoint.id } },
            create: { threadId, checkpointNs, checkpointId: checkpoint.id, ...data },
            update: data,
        });
        return { configurable: { thread_id: threadId, checkpoint_ns: checkpointNs, checkpoint_id: checkpoint.id } };
    }

    async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
        const c = configurable(config);
        const threadId = requireThread(c);
        const tenantId = requireTenant(c);
        const checkpointNs = c.checkpoint_ns ?? '';
        const checkpointId = c.checkpoint_id;
        if (!checkpointId) throw new Error('PrismaCheckpointSaver.putWrites: configurable.checkpoint_id is required');

        // Serialize first (async), then build the Prisma queries (sync) so the array
        // passed to $transaction holds un-awaited PrismaPromises — awaiting them
        // individually here would run each upsert outside the transaction.
        const serialized = await Promise.all(
            writes.map(async ([channel, value], index) => {
                const idx = WRITES_IDX_MAP[channel] ?? index;
                const [type, bytes] = await this.serde.dumpsTyped(value);
                return { idx, channel, type, value: Buffer.from(bytes), tenantId };
            }),
        );
        const operations = serialized.map(({ idx, ...payload }) =>
            this.prisma.aiCheckpointWrite.upsert({
                where: {
                    threadId_checkpointNs_checkpointId_taskId_idx: { threadId, checkpointNs, checkpointId, taskId, idx },
                },
                create: { threadId, checkpointNs, checkpointId, taskId, idx, ...payload },
                update: payload,
            }),
        );
        await this.prisma.$transaction(operations);
    }

    async deleteThread(threadId: string): Promise<void> {
        await this.prisma.$transaction([
            this.prisma.aiCheckpointWrite.deleteMany({ where: { threadId } }),
            this.prisma.aiCheckpoint.deleteMany({ where: { threadId } }),
        ]);
    }
}
