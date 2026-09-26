import { Inject, Injectable, Scope } from '@nestjs/common';
import { DiscoveryModule, REQUEST } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AiToolProvider, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { AiToolRegistry } from './ai-tool-registry';

@Injectable({ scope: Scope.REQUEST })
class RequestScopedDependency {
    constructor(@Inject(REQUEST) readonly req: unknown) {}
}

/** Implicitly request-scoped: Nest never runs its constructor outside a request. */
@AiToolProvider()
@Injectable()
class RequestScopedTools implements AiToolSource {
    constructor(readonly dep: RequestScopedDependency) {}

    aiTools(): readonly AiTool[] {
        return [];
    }
}

describe('AiToolRegistry', () => {
    it('refuses a tool provider whose dependency tree is request-scoped', async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [DiscoveryModule],
            providers: [AiToolRegistry, RequestScopedDependency, RequestScopedTools],
        }).compile();

        await expect(moduleRef.init()).rejects.toThrow(/RequestScopedTools.*request-scoped/);
    });
});
