import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { AI_TOOL_PROVIDER_METADATA, type AiTool, type AiToolContext, type AiToolRisk, type AiToolSource } from '@devloggers/backend-core';
import { domainKeys } from '../../../domain/manifest';
import { ALWAYS_LOADED_DOMAINS, NEVER_DELETE_RESOURCES, TOOL_NAME_PATTERN } from './tool-names';

function isToolSource(instance: unknown): instance is AiToolSource {
    return instance !== null && typeof instance === 'object' && typeof (instance as { aiTools?: unknown }).aiTools === 'function';
}

const SEARCH_LIMIT = 25;

/** Filler words a model wraps around real intent ("list all available invoice tools"). */
const SEARCH_STOP_WORDS = new Set([
    'a', 'all', 'an', 'and', 'available', 'can', 'do', 'domain', 'domains', 'for', 'i', 'in',
    'is', 'me', 'of', 'on', 'or', 'please', 'the', 'to', 'tool', 'tools', 'what', 'with', 'you',
]);

/**
 * A natural-language query is rarely one substring of a tool description, so match it word by
 * word. Without this, `tools.search("invoices create list")` returns nothing and the model
 * concludes every non-always-loaded tool (invoicing, inventory, accounting) is unavailable.
 */
function searchTerms(query: string): string[] {
    return [...new Set(
        query
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((term) => term.length > 1 && !SEARCH_STOP_WORDS.has(term)),
    )];
}

/** Name beats domain, domain beats description — a tool named `invoices.list` is the best hit. */
function searchScore(tool: AiTool, terms: readonly string[]): number {
    const name = tool.name.toLowerCase();
    const domain = tool.domain.toLowerCase();
    const description = tool.description.toLowerCase();
    return terms.reduce((score, term) => {
        if (name.includes(term)) return score + 3;
        if (domain.includes(term)) return score + 2;
        if (description.includes(term)) return score + 1;
        return score;
    }, 0);
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

    search(ctx: AiToolContext, query: string): { name: string; domain: string; description: string; risk: AiToolRisk }[] {
        const terms = searchTerms(query);
        const matches = this.permitted(ctx).map((tool) => ({ tool, score: searchScore(tool, terms) }));
        return matches
            .filter(({ score }) => terms.length === 0 || score > 0)
            .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
            .slice(0, SEARCH_LIMIT)
            .map(({ tool: { name, domain, description, risk } }) => ({ name, domain, description, risk }));
    }

    availableDomains(ctx: AiToolContext): string[] {
        return [...new Set(this.permitted(ctx).map((tool) => tool.domain))].sort();
    }
}
