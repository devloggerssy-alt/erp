import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

/** Per-user sliding window, in-process. Enough for one API instance; revisit when scaling out. */
@Injectable()
export class ChatRateLimiter {
    private readonly hits = new Map<string, number[]>();

    consume(userId: string, now: number = Date.now()): void {
        const recent = (this.hits.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);
        if (recent.length >= MAX_REQUESTS) {
            throw new HttpException('Too many AI requests — wait a minute and try again', HttpStatus.TOO_MANY_REQUESTS);
        }
        recent.push(now);
        this.hits.set(userId, recent);
    }
}
