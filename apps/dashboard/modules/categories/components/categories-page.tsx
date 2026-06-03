"use client"

import { CategoriesResource } from "../categories.resource"
import { CategoriesForm } from "./categories-form"
import { createCategoriesColumns } from "./categories-columns"

export function CategoriesPage() {
    return (
        <CategoriesResource>
            <CategoriesResource.Page
                title="الفئات"
                toolbar={
                    <CategoriesResource.Toolbar>
                        <CategoriesResource.Filter />
                        <div className="ms-auto w-full max-w-sm sm:w-auto">
                            <CategoriesResource.Search />
                        </div>
                    </CategoriesResource.Toolbar>
                }
                actions={
                    <CategoriesResource.FormDialog
                        title={(it) => (it?.id ? it.name : "إضافة فئة")}
                        form={CategoriesForm}
                    />
                }
            >
                <CategoriesResource.Table columns={createCategoriesColumns} />
            </CategoriesResource.Page>
        </CategoriesResource>
    )
}
