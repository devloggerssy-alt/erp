import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './repositories/users.repository';
import { UserPresenter } from './presenters/user.presenter';

@Module({
    controllers: [UsersController],
    providers: [UsersService, UsersRepository, UserPresenter],
    exports: [UsersService],
})
export class UsersModule {}
