import type { LocalizedString } from './i18n.dto'
import type { CustomFieldModule } from '../custom-fields/modules'
import type { FieldType } from '../custom-fields/field-type'
import type { CustomFieldValuesMap } from '../custom-fields/values'

export interface CreateCustomFieldDto {
    module: CustomFieldModule
    name: LocalizedString
    label: LocalizedString
    type: FieldType
    defaultValue?: string
    placeholder?: LocalizedString
    options?: string[]
    isRequired?: boolean
    showInList?: boolean
}

export interface UpdateCustomFieldDto {
    name?: LocalizedString
    label?: LocalizedString
    type?: FieldType
    defaultValue?: string
    placeholder?: LocalizedString
    options?: string[]
    isRequired?: boolean
    showInList?: boolean
}

export interface CustomFieldResponseDto {
    id: string
    module: CustomFieldModule
    name: LocalizedString
    label: LocalizedString
    type: FieldType
    defaultValue: string | null
    placeholder: LocalizedString | null
    options: string[]
    isRequired: boolean
    showInList: boolean
    createdAt: string
}

export type { CustomFieldValuesMap }
