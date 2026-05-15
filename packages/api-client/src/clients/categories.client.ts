import { CrudClient } from "../infra";
import { itemCategoryResource } from "@devloggers/api-contracts";
export class CategoriesClient extends CrudClient<typeof itemCategoryResource> {
   
}