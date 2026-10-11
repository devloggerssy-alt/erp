import { Module } from '@nestjs/common';
import { LocaleResolverService } from '@devloggers/backend-core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './repositories/users.repository';
import { UserPresenter } from './presenters/user.presenter';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
    // ProfileController must stay first: it owns PATCH /users/me, which would
    // otherwise be captured by UsersController's PATCH /users/:id.
    controllers: [ProfileController, UsersController],
    providers: [UsersService, UsersRepository, UserPresenter, LocaleResolverService, ProfileService],
    exports: [UsersService],
})
export class UsersModule {}
