/**
 * Public API of the custom-fields domain. Other domains import from
 * 'modules/custom-fields' only (Phase 5.2). Files inside custom-fields must
 * not import this barrel.
 *
 * Known debt: CustomFieldsRepository is exported because catalog's item
 * import/export reads field definitions with findByModule. A read method on
 * CustomFieldsService would be the cleaner public surface.
 */
export { CustomFieldsModule } from './custom-fields.module';
export { CustomFieldValuesService } from './services/custom-field-values.service';
export { CustomFieldsRepository } from './repositories/custom-fields.repository';
