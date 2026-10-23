import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { AI_TOOL_PROVIDER_METADATA, type AiTool, type AiToolContext, type AiToolRisk, type AiToolSource } from '@devloggers/backend-core';
import { domainKeys } from '../../../domain/manifest';
import { ALWAYS_LOADED_DOMAINS, NEVER_DELETE_RESOURCES, TOOL_NAME_PATTERN } from './tool-names';

function isToolSource(instance: unknown): instance is AiToolSource {
    return instance !== null && typeof instance === 'object' && typeof (instance as { aiTools?: unknown }).aiTools === 'function';
}

export type ToolCatalogSummary = { domain: string; tools: string[] };
export type ToolCatalogEntry = { name: string; description: string; risk: AiToolRisk };
export type ToolCatalog =
    | { domains: ToolCatalogSummary[] }
    | { domain: string; tools: ToolCatalogEntry[] }
    | { error: string; availableDomains: string[] };

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
            // A request-scoped provider (or one depending on one) is only a constructor-less prototype
            // at bootstrap: its methods exist but its injected fields are undefined.
            if (!wrapper.isDependencyTreeStatic()) {
                throw new Error(
                    `${metatype.name} is an @AiToolProvider() but its dependency tree is request-scoped; ` +
                        'tool providers must be singletons',
                );
            }
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

    /** Deterministic index of every permitted domain and tool, marked by loaded state. */
    toolIndex(ctx: AiToolContext, loadedDomains: readonly string[]): string {
        return [...this.byDomain(ctx)]
            .map(([domain, tools]) => {
                const loaded = ALWAYS_LOADED_DOMAINS.has(domain) || loadedDomains.includes(domain);
                return `- ${domain} (${loaded ? 'loaded' : 'not loaded'}): ${tools.map((tool) => tool.name).join(', ')}`;
            })
            .join('\n');
    }

    /** Catalog for `tools.catalog`: every domain and its tool names, or one domain's tool details. */
    catalog(ctx: AiToolContext, domain?: string): ToolCatalog {
        const byDomain = this.byDomain(ctx);
        if (domain === undefined) {
            return {
                domains: [...byDomain].map(([key, tools]) => ({
                    domain: key,
                    tools: tools.map((tool) => tool.name),
                })),
            };
        }
        const tools = byDomain.get(domain);
        return tools
            ? { domain, tools: tools.map(({ name, description, risk }) => ({ name, description, risk })) }
            : { error: `Unknown or unavailable domain "${domain}"`, availableDomains: [...byDomain.keys()] };
    }

    availableDomains(ctx: AiToolContext): string[] {
        return [...this.byDomain(ctx).keys()];
    }

    /** Permitted tools grouped by domain, both sides sorted for a stable prompt. */
    private byDomain(ctx: AiToolContext): Map<string, AiTool[]> {
        const byDomain = new Map<string, AiTool[]>();
        for (const tool of this.permitted(ctx)) {
            const tools = byDomain.get(tool.domain) ?? [];
            tools.push(tool);
            byDomain.set(tool.domain, tools);
        }
        for (const tools of byDomain.values()) tools.sort((a, b) => a.name.localeCompare(b.name));
        return new Map([...byDomain.entries()].sort(([a], [b]) => a.localeCompare(b)));
    }
}
