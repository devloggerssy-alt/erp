import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'express';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatModelFactory } from '../runtime/model.factory';
import { JwtAuthGuard, PermissionsGuard } from '../../identity/auth/guards';

describe('POST /ai/conversations/:id/chat — status', () => {
    let app: INestApplication;
    const chatService = {
        stream: jest.fn(async (_user: unknown, _id: string, _body: unknown, _locale: string, res: Response) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.end('data: [DONE]\n\n');
        }),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            controllers: [ChatController],
            providers: [
                { provide: ChatService, useValue: chatService },
                { provide: ChatModelFactory, useValue: { describe: jest.fn() } },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (ctx: ExecutionContext) => {
                    ctx.switchToHttp().getRequest<{ user?: unknown }>().user = {
                        id: 'u1',
                        tenantId: 't1',
                        email: 'u1@example.test',
                    };
                    return true;
                },
            })
            .overrideGuard(PermissionsGuard)
            .useValue({ canActivate: () => true })
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('answers 200 for the SSE stream, not an injected empty 201', async () => {
        await request(app.getHttpServer())
            .post('/ai/conversations/c1/chat')
            .send({ message: { id: 'm1', text: 'hi' } })
            .expect(200);
    });
});
