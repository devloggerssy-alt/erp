import { Module } from '@nestjs/common';
import { CustomFieldsController } from './controllers/custom-fields.controller';
import { CustomFieldsService } from './services/custom-fields.service';
import { CustomFieldValuesService } from './services/custom-field-values.service';
import { CustomFieldsRepository } from './repositories/custom-fields.repository';
import { CustomFieldValuesRepository } from './repositories/custom-field-values.repository';
import { CustomFieldPresenter } from './presenters/custom-field.presenter';

@Module({
    controllers: [CustomFieldsController],
    providers: [
        CustomFieldsRepository,
        CustomFieldValuesRepository,
        CustomFieldsService,
        CustomFieldValuesService,
        CustomFieldPresenter,
    ],
    exports: [CustomFieldsService, CustomFieldValuesService, CustomFieldsRepository],
})
export class CustomFieldsModule {}
