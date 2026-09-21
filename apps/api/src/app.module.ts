import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from '@devloggers/i18n/nest';
import { ApiExceptionFilter, validationExceptionFactory } from '@devloggers/backend-core';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { enabledModuleImports } from './domain/domain-modules';
import { DomainAvailabilityGuard } from './domain/domain-availability.guard';
import { DisabledDomainFilter } from './domain/disabled-domain.filter';
import { CrudEventsListener } from './common/events/crud-events.listener';
import configuration from './config/configuration';
import { envValidationSchema } from './config/envValidator';

@Module({
  imports: [
    // MUST stay first: ConfigModule.forRoot loads .env.<NODE_ENV> and assigns
    // the values to process.env synchronously, before the domain registry
    // below reads DISABLED_DOMAINS.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      validationSchema: envValidationSchema,
      load: [configuration],
    }),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', global: true }),
    ScheduleModule.forRoot(),
    I18nModule,
    PrismaModule,
    // Phase 8.2.1 — domain composition comes from the capability registry.
    // DISABLED_DOMAINS is validated in src/domain/manifest.ts.
    ...enabledModuleImports(process.env.DISABLED_DOMAINS),
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        exceptionFactory: validationExceptionFactory,
      }),
    },
    { provide: APP_GUARD, useClass: DomainAvailabilityGuard },
    // Registered before DisabledDomainFilter: global filters are matched in
    // reverse registration order, so the 404-specific filter wins for 404s and
    // this catch-all envelopes everything else.
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_FILTER, useClass: DisabledDomainFilter },
    CrudEventsListener,
  ],
})
export class AppModule { }
