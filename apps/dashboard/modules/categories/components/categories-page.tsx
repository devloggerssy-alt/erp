"use client"

import { CategoriesResource } from "../categories.resource"
import { CategoriesForm } from "./categories-form"
import { createCategoriesColumns } from "./categories-columns"

export function CategoriesPage() {
    return (
        <CategoriesResource>
            <CategoriesResource.Page
                title="الفئات"
                actions={<CategoriesResource.FormDialog 
                    title={data=>data?.id? 'تعديل فئة' :'إضافة فئة'}
                    form={CategoriesForm} />}
            >
                <CategoriesResource.Table columns={createCategoriesColumns} />
            </CategoriesResource.Page>
        </CategoriesResource>
    )
}
