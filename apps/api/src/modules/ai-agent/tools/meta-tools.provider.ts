import { Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { AiToolRegistry } from './ai-tool-registry';

export class ToolsCatalogInputDto {
    @ApiPropertyOptional({
        type: 'string',
        description: 'Domain key from the tool index, e.g. "invoicing". Omit to list every domain and its tool names.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    domain?: string;
}

export class ToolsLoadInputDto {
    @ApiProperty({ type: 'string', description: 'Exact domain key from the tool index, e.g. "invoicing"' })
    @IsString()
    @IsNotEmpty()
    domain!: string;
}

@AiToolProvider()
@Injectable()
export class MetaToolsProvider implements AiToolSource {
    constructor(private readonly registry: AiToolRegistry) {}

    aiTools(): readonly AiTool[] {
        return [
            defineAiTool({
                name: 'tools.catalog',
                domain: 'ai-agent',
                risk: 'read',
                permission: 'ai.use',
                description:
                    'List every permitted tool domain and its tool names, or pass one domain to get its full tool ' +
                    'descriptions and risk. Use the exact domain keys from the tool index, then call tools.load(domain).',
                input: dtoInput(ToolsCatalogInputDto),
                handler: (ctx, input) => Promise.resolve(this.registry.catalog(ctx, input.domain)),
            }),
            defineAiTool({
                name: 'tools.load',
                domain: 'ai-agent',
                risk: 'read',
                permission: 'ai.use',
                description:
                    'Enable every tool of one exact domain key so you can call them on your next step. Use a domain ' +
                    'key from the tool index or tools.catalog; loading an already-loaded domain is harmless.',
                input: dtoInput(ToolsLoadInputDto),
                handler: (ctx, input) => {
                    const available = this.registry.availableDomains(ctx);
                    return Promise.resolve(
                        available.includes(input.domain)
                            ? { loadedDomain: input.domain }
                            : {
                                  error:
                                      `Unknown or unavailable domain "${input.domain}". ` +
                                      `Available domains: ${available.join(', ') || 'none'}`,
                              },
                    );
                },
            }),
        ];
    }
}
