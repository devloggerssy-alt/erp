import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard } from '../../auth/guards';
import { CurrentUser, RequestUser } from '../../auth/decorators';
import { RequirePermission } from '@devloggers/backend-core';
import { ApiResponseBuilder } from '../../../../common/api/api-response-builder';
import { ApiOkResponseStandard, ApiStandardErrors } from '../../../../common/decorators/api-swagger.decorators';
import { OnboardingService } from '../services/onboarding.service';
import {
    OnboardingChartOfAccountsResponseDto,
    OnboardingCompanyStepDto,
    OnboardingFiscalYearStepDto,
    OnboardingGlDefaultsStepDto,
    OnboardingDocumentSequencesStepDto,
    OnboardingCurrenciesStepDto,
    OnboardingStepAckDto,
} from '../dto/onboarding.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) {}

    @Post('step/company')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Step 1 — Company profile & localization' })
    @ApiOkResponseStandard(OnboardingStepAckDto, { description: 'Company step saved' })
    @ApiStandardErrors()
    async stepCompany(@CurrentUser() user: RequestUser, @Body() dto: OnboardingCompanyStepDto) {
        await this.onboardingService.stepCompany(user.tenantId, dto);
        return this.ack('Company step saved');
    }

    @Post('step/fiscal-year')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Step 2 — First fiscal period' })
    @ApiOkResponseStandard(OnboardingStepAckDto, { description: 'Fiscal year step saved' })
    @ApiStandardErrors()
    async stepFiscalYear(@CurrentUser() user: RequestUser, @Body() dto: OnboardingFiscalYearStepDto) {
        await this.onboardingService.stepFiscalYear(user.tenantId, dto);
        return this.ack('Fiscal year step saved');
    }

    @Post('step/chart-of-accounts')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Step 3 — Bootstrap default chart of accounts; returns codeToId map' })
    @ApiOkResponseStandard(OnboardingChartOfAccountsResponseDto, { description: 'Chart of accounts bootstrapped' })
    @ApiStandardErrors()
    async stepChartOfAccounts(@CurrentUser() user: RequestUser) {
        const codeToId = await this.onboardingService.stepChartOfAccounts(user.tenantId);
        return ApiResponseBuilder.success({ codeToId }, 'Chart of accounts bootstrapped');
    }

    @Post('step/gl-defaults')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Step 4 — Set default GL accounts' })
    @ApiOkResponseStandard(OnboardingStepAckDto, { description: 'GL defaults saved' })
    @ApiStandardErrors()
    async stepGlDefaults(@CurrentUser() user: RequestUser, @Body() dto: OnboardingGlDefaultsStepDto) {
        await this.onboardingService.stepGlDefaults(user.tenantId, dto);
        return this.ack('GL defaults saved');
    }

    @Post('step/currencies')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Step 4 — Bootstrap currencies (SYP + USD) and cashboxes' })
    @ApiOkResponseStandard(OnboardingStepAckDto, { description: 'Currencies step saved' })
    @ApiStandardErrors()
    async stepCurrencies(@CurrentUser() user: RequestUser, @Body() dto: OnboardingCurrenciesStepDto) {
        await this.onboardingService.stepCurrencies(user.tenantId, dto);
        return this.ack('Currencies step saved');
    }

    @Post('step/document-sequences')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Step 5 — Create document sequences' })
    @ApiOkResponseStandard(OnboardingStepAckDto, { description: 'Document sequences saved' })
    @ApiStandardErrors()
    async stepDocumentSequences(@CurrentUser() user: RequestUser, @Body() dto: OnboardingDocumentSequencesStepDto) {
        await this.onboardingService.stepDocumentSequences(user.tenantId, dto);
        return this.ack('Document sequences saved');
    }

    @Post('complete')
    @RequirePermission('onboarding.manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark onboarding as completed' })
    @ApiOkResponseStandard(OnboardingStepAckDto, { description: 'Onboarding completed' })
    @ApiStandardErrors()
    async complete(@CurrentUser() user: RequestUser) {
        await this.onboardingService.complete(user.tenantId);
        return this.ack('Onboarding completed');
    }

    private ack(message: string) {
        return ApiResponseBuilder.success({ accepted: true }, message);
    }
}
