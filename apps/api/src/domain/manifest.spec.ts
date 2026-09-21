import {
    DOMAIN_MANIFESTS,
    SHARED_KERNEL,
    disabledDomainMessage,
    manifestByKey,
    resolveDomainForPath,
    resolveEnabledDomains,
    type DomainKey,
} from './manifest';

describe('domain manifest', () => {
    it('declares every key exactly once with valid dependencies', () => {
        const keys = DOMAIN_MANIFESTS.map((manifest) => manifest.key);
        expect(new Set(keys).size).toBe(keys.length);

        for (const manifest of DOMAIN_MANIFESTS) {
            expect(manifest.dependsOn).not.toContain(manifest.key);
            expect(manifest.dependsOn).not.toContain(SHARED_KERNEL);
            for (const dependency of manifest.dependsOn) {
                expect(() => manifestByKey(dependency)).not.toThrow();
            }
        }
    });

    it('requires a documented rationale for every non-optional domain (8.1.3)', () => {
        for (const manifest of DOMAIN_MANIFESTS.filter((candidate) => !candidate.optional)) {
            expect((manifest.rationale ?? '').trim().length).toBeGreaterThan(0);
        }
        expect(manifestByKey('accounting').optional).toBe(false);
        expect(manifestByKey('accounting').rationale).toContain('Phase 8.1.3');
    });

    it('has no dependency cycle outside the shared kernel', () => {
        const visiting = new Set<string>();
        const visited = new Set<string>();

        const visit = (key: DomainKey): void => {
            if (visited.has(key)) return;
            expect(visiting.has(key)).toBe(false);
            visiting.add(key);
            for (const dependency of manifestByKey(key).dependsOn) visit(dependency);
            visiting.delete(key);
            visited.add(key);
        };

        for (const manifest of DOMAIN_MANIFESTS) visit(manifest.key);
    });
});

describe('resolveEnabledDomains', () => {
    it('enables everything by default', () => {
        const { enabled, disabled } = resolveEnabledDomains(undefined);
        expect(disabled).toEqual([]);
        expect(enabled).toEqual(DOMAIN_MANIFESTS.map((manifest) => manifest.key));
    });

    it('disables optional leaf domains', () => {
        expect(resolveEnabledDomains('files, ai-chat').disabled).toEqual(['files', 'ai-chat']);
    });

    it('rejects unknown domains with a clear error', () => {
        expect(() => resolveEnabledDomains('bogus')).toThrow('Unknown domain in DISABLED_DOMAINS: "bogus"');
    });

    it('refuses to disable a non-optional domain', () => {
        expect(() => resolveEnabledDomains('accounting')).toThrow(/cannot be disabled.*Phase 8.1.3/s);
    });

    it('refuses to disable a domain an enabled domain depends on', () => {
        expect(() => resolveEnabledDomains('custom-fields')).toThrow(/enabled domain\(s\) depend on it: catalog/);
    });

    it('refuses to disable catalog — onboarding (identity) depends on it', () => {
        expect(() => resolveEnabledDomains('catalog')).toThrow(/cannot be disabled/);
    });
});

describe('resolveDomainForPath', () => {
    it('matches exact and nested routes', () => {
        expect(resolveDomainForPath('/files')).toBe('files');
        expect(resolveDomainForPath('/files/42/download')).toBe('files');
    });

    it('prefers the longest route when prefixes overlap', () => {
        expect(resolveDomainForPath('/settings/financial')).toBe('accounting');
        expect(resolveDomainForPath('/settings/danger')).toBe('identity');
        expect(resolveDomainForPath('/settings')).toBe('identity');
    });

    it('returns null for infrastructure and unknown paths', () => {
        expect(resolveDomainForPath('/docs')).toBeNull();
        expect(resolveDomainForPath('/')).toBeNull();
    });
});

describe('disabledDomainMessage', () => {
    it('names the domain', () => {
        expect(disabledDomainMessage('files')).toBe('The "files" module is disabled in this deployment.');
    });
});
