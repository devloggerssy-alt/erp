import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { AI_TOOL_PROVIDER_METADATA, type AiTool, type AiToolContext, type AiToolRisk, type AiToolSource } from '@devloggers/backend-core';
import { domainKeys } from '../../../domain/manifest';
import { ALWAYS_LOADED_DOMAINS, NEVER_DELETE_RESOURCES, TOOL_NAME_PATTERN } from './tool-names';

function isToolSource(instance: unknown): instance is AiToolSource {
    return instance !== null && typeof instance === 'object' && typeof (instance as { aiTools?: unknown }).aiTools === 'function';
}

@Injectable()
export class AiToolRegistry implements OnApplicationBootstrap {
    private readonly logger = new Logger(AiToolRegistry.name);
    private readonly tools = new Map<string, AiTool>();

    constructor(
        private readonly discovery: DiscoveryService,
        private readonly reflector: Reflector,
    ) {}

    onApplicationBootstrap(): void {
        const knownDomains = new Set<string>(domainKeys());
        for (const wrapper of this.discovery.getProviders()) {
            const { metatype, instance } = wrapper;
            if (!metatype || typeof metatype !== 'function') continue;
            if (!this.reflector.get<boolean | undefined>(AI_TOOL_PROVIDER_METADATA, metatype)) continue;
            if (!isToolSource(instance)) {
                throw new Error(`${metatype.name} is an @AiToolProvider() but does not implement aiTools()`);
            }
            for (const tool of instance.aiTools()) this.register(tool, knownDomains);
        }
        this.logger.log(`Registered ${this.tools.size} AI tools`);
    }

    private register(tool: AiTool, knownDomains: ReadonlySet<string>): void {
        if (!TOOL_NAME_PATTERN.test(tool.name) || tool.name.includes('__')) {
            throw new Error(`AI tool name "${tool.name}" must match domain-noun.verb and not contain "__"`);
        }
        if (this.tools.has(tool.name)) throw new Error(`Duplicate AI tool name "${tool.name}"`);
        if (!knownDomains.has(tool.domain)) throw new Error(`AI tool "${tool.name}" has unknown domain "${tool.domain}"`);
        if (tool.name.endsWith('.delete') && tool.resource && NEVER_DELETE_RESOURCES.has(tool.resource)) {
            throw new Error(`AI tool "${tool.name}" deletes "${tool.resource}", which is cancel/reverse-only (.ai/rules/domain.md)`);
        }
        this.tools.set(tool.name, tool);
    }

    /** Every tool the user may call, regardless of scope. */
    private permitted(ctx: AiToolContext): AiTool[] {
        return [...this.tools.values()].filter((tool) => tool.enabled && ctx.permissions.has(tool.permission));
    }

    /** Tools offered to the model this turn: permitted AND (always-loaded domain OR loaded via tools.load). */
    forUser(ctx: AiToolContext, loadedDomains: readonly string[]): AiTool[] {
        return this.permitted(ctx).filter(
            (tool) => ALWAYS_LOADED_DOMAINS.has(tool.domain) || loadedDomains.includes(tool.domain),
        );
    }

    /** Execution lookup — permission is enforced here, scope is not (scope only limits the prompt). */
    find(ctx: AiToolContext, name: string): AiTool | undefined {
        const tool = this.tools.get(name);
        return tool && tool.enabled && ctx.permissions.has(tool.permission) ? tool : undefined;
    }

    search(ctx: AiToolContext, query: string): { name: string; domain: string; description: string; risk: AiToolRisk }[] {
        const needle = query.trim().toLowerCase();
        return this.permitted(ctx)
            .filter((tool) => !needle || `${tool.name} ${tool.description}`.toLowerCase().includes(needle))
            .slice(0, 25)
            .map(({ name, domain, description, risk }) => ({ name, domain, description, risk }));
    }

    availableDomains(ctx: AiToolContext): string[] {
        return [...new Set(this.permitted(ctx).map((tool) => tool.domain))].sort();
    }
}
