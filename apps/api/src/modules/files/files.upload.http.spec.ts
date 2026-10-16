import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { JwtAuthGuard, PermissionsGuard } from '@/modules/identity/auth/guards';

const record = {
    id: 'f1',
    tenantId: 't1',
    originalName: 'a.png',
    mimeType: 'image/png',
    size: 3,
    extension: 'png',
    folder: 'items',
    path: 't1/items/a.png',
    url: '/uploads/t1/items/a.png',
    checksum: null,
    createdAt: '2026-10-16T10:00:00.000Z',
    updatedAt: '2026-10-16T10:00:00.000Z',
};

describe('POST /files/upload — envelope', () => {
    let app: INestApplication;
    const service = {
        upload: jest.fn().mockResolvedValue(record),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            controllers: [FilesController],
            providers: [{ provide: FilesService, useValue: service }],
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

    it('wraps the uploaded file metadata in the shared success envelope', async () => {
        const res = await request(app.getHttpServer())
            .post('/files/upload')
            .field('folder', 'items')
            .attach('file', Buffer.from('png'), 'a.png')
            .expect(201);

        expect(res.body).toEqual({
            status: 'success',
            message: 'File uploaded',
            data: record,
        });
    });
});
