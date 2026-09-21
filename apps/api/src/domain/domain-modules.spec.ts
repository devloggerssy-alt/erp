import { FilesModule } from '../modules/files/files.module';
import { DOMAIN_MODULES, enabledModuleImports } from './domain-modules';
import { DOMAIN_MANIFESTS } from './manifest';

describe('domain module registry', () => {
    it('has module entries for every manifest key', () => {
        expect(Object.keys(DOMAIN_MODULES).sort()).toEqual(DOMAIN_MANIFESTS.map((manifest) => manifest.key).sort());
        for (const modules of Object.values(DOMAIN_MODULES)) expect(modules.length).toBeGreaterThan(0);
    });

    it('imports every domain by default', () => {
        expect(enabledModuleImports(undefined)).toContain(FilesModule);
    });

    it('omits disabled domains', () => {
        expect(enabledModuleImports('files')).not.toContain(FilesModule);
    });

    it('propagates registry validation errors', () => {
        expect(() => enabledModuleImports('accounting')).toThrow(/cannot be disabled/);
    });
});
