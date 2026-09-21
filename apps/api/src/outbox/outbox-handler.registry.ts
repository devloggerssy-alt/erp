import { Injectable } from '@nestjs/common';
import type { OutboxEventHandler } from './outbox.types';

/** topic → delivery handler map (Phase 8.4.3). Unknown topics are dead-lettered. */
@Injectable()
export class OutboxHandlerRegistry {
    private readonly handlers = new Map<string, OutboxEventHandler>();

    register(topic: string, handler: OutboxEventHandler): void {
        this.handlers.set(topic, handler);
    }

    resolve(topic: string): OutboxEventHandler | undefined {
        return this.handlers.get(topic);
    }
}
