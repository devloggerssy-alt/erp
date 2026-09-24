import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AiToolProvider, defineAiTool, dtoInput, type AiTool, type AiToolSource } from '@devloggers/backend-core';
import { AiToolRegistry } from './ai-tool-registry';

export class ToolsSearchInputDto {
    @ApiProperty({ type: 'string', description: 'What you want to do, e.g. "stock count" or "warehouse"' })
    @IsString()
    @MaxLength(200)
    query!: string;
}

export class ToolsLoadInputDto {
    @ApiProperty({ type: 'string', description: 'Domain key returned by tools.search, e.g. "inventory"' })
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
                name: 'tools.search',
                domain: 'ai-agent',
                risk: 'read',
                permission: 'ai.use',
                description:
                    'Find tools you are allowed to use that are not loaded yet. Returns name, domain, description, risk. ' +
                    'Then call tools.load with the domain to use them.',
                input: dtoInput(ToolsSearchInputDto),
                handler: (ctx, input) => Promise.resolve({ tools: this.registry.search(ctx, input.query) }),
            }),
            defineAiTool({
                name: 'tools.load',
                domain: 'ai-agent',
                risk: 'read',
                permission: 'ai.use',
                description: 'Load all tools of one domain so you can call them on your next step.',
                input: dtoInput(ToolsLoadInputDto),
                handler: (ctx, input) => {
                    const available = this.registry.availableDomains(ctx).includes(input.domain);
                    return Promise.resolve(
                        available
                            ? { loadedDomain: input.domain }
                            : { error: `Unknown or unavailable domain "${input.domain}"` },
                    );
                },
            }),
        ];
    }
}
