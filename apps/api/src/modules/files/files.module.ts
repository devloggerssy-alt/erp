import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { AvatarController } from './avatar.controller';

@Module({
    imports: [],
    controllers: [AvatarController, FilesController],
    providers: [FilesService],
    exports: [FilesService],
})
export class FilesModule { }


