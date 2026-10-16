import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TagAssignmentsController } from './tag-assignments.controller';
import { TagAssignmentsService } from '../services/tag-assignments.service';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';

const assignment = {
    id: 'a1',
    tagId: 'tag-1',
    entityType: 'item',
    entityId: 'item-1',
    tag: { id: 'tag-1', name: 'Fresh', color: null, module: 'items' },
    createdAt: '2026-10-16T10:00:00.000Z',
};

describe('tag-assignments HTTP envelope', () => {
    let app: INestApplication;
    const service = {
        list: jest.fn().mockResolvedValue([assignment]),
        assign: jest.fn().mockResolvedValue(assignment),
        unassign: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            controllers: [TagAssignmentsController],
            providers: [{ provide: TagAssignmentsService, useValue: service }],
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

    it('GET /tag-assignments wraps the list in the shared success envelope', async () => {
        const res = await request(app.getHttpServer())
            .get('/tag-assignments?entityType=item&entityId=item-1')
            .expect(200);

        expect(res.body).toEqual({
            status: 'success',
            message: 'Tag assignments',
            data: [assignment],
        });
    });

    it('POST /tag-assignments wraps the created assignment in the shared success envelope', async () => {
        const res = await request(app.getHttpServer())
            .post('/tag-assignments')
            .send({ tagId: 'tag-1', entityType: 'item', entityId: 'item-1' })
            .expect(201);

        expect(res.body).toEqual(
            expect.objectContaining({ status: 'success', data: assignment }),
        );
    });

    it('DELETE /tag-assignments/:id stays a bodyless 204', async () => {
        await request(app.getHttpServer()).delete('/tag-assignments/a1').expect(204);
    });
});
