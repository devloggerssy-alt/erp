import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export class RequestUser {
    id: string;
    tenantId: string;
    email: string;
}

export const CurrentUser = createParamDecorator(
    (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | string => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as RequestUser;
        return data ? user[data] : user;
    },
);
