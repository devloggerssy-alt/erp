import { ConflictException, Injectable } from '@nestjs/common';

/** Per-conversation in-flight guard, in-process. Enough for one API instance; revisit when scaling out. */
@Injectable()
export class ConversationTurnLock {
    private readonly active = new Set<string>();

    /** Throws if a turn for this conversation is already streaming (two tabs, a retry, a resend). */
    acquire(conversationId: string): void {
        if (this.active.has(conversationId)) {
            throw new ConflictException('A response is already being generated for this conversation');
        }
        this.active.add(conversationId);
    }

    release(conversationId: string): void {
        this.active.delete(conversationId);
    }
}
