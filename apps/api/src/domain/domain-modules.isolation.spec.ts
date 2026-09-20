import { compileIsolated } from '../common/testing/module-isolation';
import { DOMAIN_MODULES } from './domain-modules';

describe('domain module isolation harness (Phase 8.3)', () => {
    it.each(Object.entries(DOMAIN_MODULES))(
        'domain "%s" boots without AppModule',
        async (_key, modules) => {
            const moduleRef = await compileIsolated(modules);
            expect(moduleRef).toBeDefined();
            await moduleRef.close();
        },
        30_000,
    );
});
