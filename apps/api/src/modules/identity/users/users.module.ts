import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './repositories/users.repository';
import { UserPresenter } from './presenters/user.presenter';

@Module({
    controllers: [UsersController],
    providers: [UsersService, UsersRepository, UserPresenter, LocaleResolverService],
    exports: [UsersService],
})
export class UsersModule {}
