import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { OnboardingService } from '../services/onboarding.service';
import {
    OnboardingCompanyStepDto,
    OnboardingFiscalYearStepDto,
    OnboardingGlDefaultsStepDto,
    OnboardingDocumentSequencesStepDto,
    OnboardingCurrenciesStepDto,
} from '../dto/onboarding.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) {}

    @Post('step/company')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Step 1 — Company profile & localization' })
    async stepCompany(@CurrentUser() user: RequestUser, @Body() dto: OnboardingCompanyStepDto) {
        await this.onboardingService.stepCompany(user.tenantId, dto);
    }

    @Post('step/fiscal-year')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Step 2 — First fiscal period' })
    async stepFiscalYear(@CurrentUser() user: RequestUser, @Body() dto: OnboardingFiscalYearStepDto) {
        await this.onboardingService.stepFiscalYear(user.tenantId, dto);
    }

    @Post('step/chart-of-accounts')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Step 3 — Bootstrap default chart of accounts; returns codeToId map' })
    async stepChartOfAccounts(@CurrentUser() user: RequestUser) {
        const codeToId = await this.onboardingService.stepChartOfAccounts(user.tenantId);
        return { codeToId };
    }

    @Post('step/gl-defaults')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Step 4 — Set default GL accounts' })
    async stepGlDefaults(@CurrentUser() user: RequestUser, @Body() dto: OnboardingGlDefaultsStepDto) {
        await this.onboardingService.stepGlDefaults(user.tenantId, dto);
    }

    @Post('step/currencies')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Step 4 — Bootstrap currencies (SYP + USD) and cashboxes' })
    async stepCurrencies(@CurrentUser() user: RequestUser, @Body() dto: OnboardingCurrenciesStepDto) {
        await this.onboardingService.stepCurrencies(user.tenantId, dto);
    }

    @Post('step/document-sequences')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Step 5 — Create document sequences' })
    async stepDocumentSequences(@CurrentUser() user: RequestUser, @Body() dto: OnboardingDocumentSequencesStepDto) {
        await this.onboardingService.stepDocumentSequences(user.tenantId, dto);
    }

    @Post('complete')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Mark onboarding as completed' })
    async complete(@CurrentUser() user: RequestUser) {
        await this.onboardingService.complete(user.tenantId);
    }
}
