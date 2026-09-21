import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

function collectMessages(errors: Array<{ constraints?: Record<string, string> }>): string[] {
    return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

export async function validateAs<T extends object>(cls: new () => T, plain: unknown): Promise<T> {
    const instance = plainToInstance(cls, plain ?? {});
    const errors = await validate(instance as object);
    if (errors.length > 0) {
        const messages = collectMessages(errors);
        throw new BadRequestException(messages.length > 0 ? messages : 'Invalid setup task payload');
    }
    return instance;
}

export async function validateArrayAs<T extends object>(cls: new () => T, plain: unknown): Promise<T[]> {
    if (!Array.isArray(plain) || plain.length === 0) {
        throw new BadRequestException('Expected a non-empty array payload');
    }
    const instances = plainToInstance(cls, plain);
    for (const instance of instances) {
        const errors = await validate(instance as object);
        if (errors.length > 0) {
            const messages = collectMessages(errors);
            throw new BadRequestException(messages.length > 0 ? messages : 'Invalid setup task payload item');
        }
    }
    return instances;
}
