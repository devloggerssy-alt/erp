import { Injectable } from '@nestjs/common';
import type { Tenant } from '@devloggers/db-prisma';
import { TenantResponseDto } from '../dto/tenant.dto';

@Injectable()
export class TenantPresenter {
    toResponse(tenant: Tenant): TenantResponseDto {
        const dto = new TenantResponseDto();
        dto.id = tenant.id;
        dto.name = tenant.name;
        dto.slug = tenant.slug;
        dto.address = tenant.address;
        dto.phone = tenant.phone;
        dto.email = tenant.email;
        dto.logo = tenant.logo;
        dto.legalName = tenant.legalName;
        dto.taxNumber = tenant.taxNumber;
        dto.website = tenant.website;
        dto.baseCurrencyId = tenant.baseCurrencyId;
        dto.defaultSalesSequenceId = tenant.defaultSalesSequenceId;
        dto.createdAt = tenant.createdAt.toISOString();
        dto.updatedAt = tenant.updatedAt.toISOString();
        return dto;
    }
}
