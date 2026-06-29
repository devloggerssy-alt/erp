"use client"

import { useTranslations } from "next-intl"
import { useWatch } from "react-hook-form"
import { type ItemsClient, type WarehousesClient } from "@devloggers/api-client"
import { itemCategoryResource, unitResource, brandResource } from "@devloggers/api-contracts"
import { ResourceFormShell, RhfCheckboxField, RhfImageField, RhfResourceSelect, RhfSelectField, RhfTextareaField, RhfTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { useFileUpload } from "@/shared/hooks/use-file-upload"
import { customFieldModules } from "@devloggers/api-contracts"
import { CustomFieldsFormSection } from "@/shared/custom-fields"
import { cn } from "@/shared/lib/utils"
import { itemsFormConfig, type ItemFormValues, type ItemOpeningWarehouseField } from "../items.config"
import { ItemTagsSection } from "./items-tags-section"
import { ItemRelationsSection } from "./items-relations-section"
import { ItemCatalogEntitiesSection } from "./items-catalog-entities-section"
import { ItemGalleryUrlsField } from "./item-gallery-urls-field"

export type ItemsFormProps = ResourceFormProps<ItemsClient> & {
    closeOnSuccess?: boolean
}

export function ItemsForm({
    resourceId,
    initialData,
    onSuccess,
    paramKey,
    closeOnSuccess = true,
}: ItemsFormProps) {
    const t = useTranslations("business.resources.items")
    const tf = useTranslations("system.resourceForm")
    const uploadFile = useFileUpload("items")

    const ctrl = useResourceFormController<ItemsClient, ItemFormValues>({
        config: itemsFormConfig,
        getClient: (api) => api.items,
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
        closeOnSuccess,
    })

    const openingStockEnabled = useWatch({ control: ctrl.form.control, name: "openingStock" })

    return (
        <ResourceFormShell ctrl={ctrl}>
            <div className="grid grid-cols-1 gap-6 items-start xl:grid-cols-[1fr_360px]">
                {/* Primary column — core item data */}
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("sectionBasic")}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <RhfTextField
                                name="code"
                                label={t("code")}
                                placeholder={t("codePlaceholder")}
                                required
                                disabled={ctrl.isBusy}
                            />
                            <RhfTextField
                                name="name"
                                label={t("name")}
                                placeholder={t("namePlaceholder")}
                                required
                                disabled={ctrl.isBusy}
                            />
                            <div className="md:col-span-2">
                                <RhfTextField
                                    name="barcode"
                                    label={t("barcode")}
                                    placeholder={t("barcodePlaceholder")}
                                    disabled={ctrl.isBusy}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("sectionClassification")}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <RhfSelectField
                                    name="itemType"
                                    label={t("itemType")}
                                    placeholder={t("itemTypePlaceholder")}
                                    options={[
                                        { label: t("itemTypes.product"), value: "product" },
                                        { label: t("itemTypes.service"), value: "service" },
                                        { label: t("itemTypes.bundle"), value: "bundle" },
                                    ]}
                                    disabled={ctrl.isBusy}
                                />
                            </div>
                            <RhfResourceSelect
                                name="category"
                                label={t("category")}
                                placeholder={t("categoryPlaceholder")}
                                client={(api) => api[itemCategoryResource.key]}
                                getLabel={(item) => (item as unknown as { name: string }).name}
                                getValue={(item) => item}
                                required
                                disabled={ctrl.isBusy}
                            />
                            <RhfResourceSelect
                                name="baseUnit"
                                label={t("baseUnit")}
                                placeholder={t("baseUnitPlaceholder")}
                                client={(api) => api[unitResource.key]}
                                getLabel={(item) => (item as unknown as { name: string }).name}
                                getValue={(item) => item}
                                required
                                disabled={ctrl.isBusy}
                            />
                            <RhfResourceSelect
                                name="brand"
                                label={t("brand")}
                                placeholder={t("brandPlaceholder")}
                                client={(api) => api[brandResource.key]}
                                getLabel={(item) => (item as unknown as { name: string }).name}
                                getValue={(item) => item}
                                disabled={ctrl.isBusy}
                            />
                        </CardContent>
                    </Card>

                    {!ctrl.isEditing && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("sectionOpeningStock")}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <RhfCheckboxField
                                    name="openingStock"
                                    label={t("openingStockEnabled")}
                                    disabled={ctrl.isBusy}
                                />
                                {openingStockEnabled && (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="md:col-span-2">
                                            <RhfResourceSelect<ItemFormValues, "openingWarehouse", WarehousesClient, ItemOpeningWarehouseField>
                                                name="openingWarehouse"
                                                label={t("openingWarehouse")}
                                                placeholder={t("openingWarehousePlaceholder")}
                                                client={(api) => api.warehouses}
                                                getLabel={(it) => `${it.name}`}
                                                getValue={(it) => it}
                                                required
                                                disabled={ctrl.isBusy}
                                            />
                                        </div>
                                        <RhfTextField
                                            name="openingCount"
                                            label={t("openingCount")}
                                            placeholder={t("openingCountPlaceholder")}
                                            type="number"
                                            required
                                            disabled={ctrl.isBusy}
                                        />
                                        <RhfTextField
                                            name="openingUnitCost"
                                            label={t("openingUnitCost")}
                                            placeholder={t("openingUnitCostPlaceholder")}
                                            type="number"
                                            disabled={ctrl.isBusy}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <CustomFieldsFormSection module={customFieldModules.items} disabled={ctrl.isBusy} showWhenEmpty />

                            {resourceId && (
                        <ItemRelationsSection itemId={resourceId} disabled={ctrl.isBusy} />
                    )}

                    {resourceId && (
                        <ItemCatalogEntitiesSection itemId={resourceId} disabled={ctrl.isBusy} />
                    )}
                </div>

                {/* Sidebar — always visible */}
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("sectionImages")}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <RhfImageField
                                name="mainImageUrl"
                                label={t("mainImageUrl")}
                                onUpload={uploadFile}
                                disabled={ctrl.isBusy}
                            />
                            <ItemGalleryUrlsField
                                label={t("galleryUrls")}
                                description={t("galleryUrlsDescription")}
                                onUpload={uploadFile}
                                disabled={ctrl.isBusy}
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t("sectionPricing")}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <RhfTextField
                                name="defaultSellingPrice"
                                label={t("defaultSellingPrice")}
                                placeholder={t("defaultSellingPricePlaceholder")}
                                type="number"
                                disabled={ctrl.isBusy}
                            />
                            <RhfTextField
                                name="latestPurchasePrice"
                                label={t("latestPurchasePrice")}
                                placeholder={t("latestPurchasePricePlaceholder")}
                                type="number"
                                disabled={ctrl.isBusy}
                            />
                        </CardContent>
                    </Card>


                       <Card>
                        <CardHeader>
                            <CardTitle>{t("sectionDescription")}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <RhfTextareaField
                                name="description"
                                label={t("description")}
                                placeholder={t("descriptionPlaceholder")}
                                 disabled={ctrl.isBusy}
                            />
                            <RhfTextareaField
                                name="note"
                                label={t("note")}
                                placeholder={t("notePlaceholder")}
                                 disabled={ctrl.isBusy}
                            />
                        </CardContent>
                    </Card>

                    {ctrl.isEditing && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t("sectionStatus")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RhfCheckboxField
                                    name="isActive"
                                    label={t("active")}
                                    description={tf("activeDescription")}
                                    disabled={ctrl.isBusy}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {resourceId && (
                        <ItemTagsSection itemId={resourceId} disabled={ctrl.isBusy} />
                    )}

            
                </div>
            </div>
        </ResourceFormShell>
    )
}
