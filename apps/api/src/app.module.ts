import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from '@devloggers/i18n/nest';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '@devloggers/db-prisma/nest';
import { enabledModuleImports } from './domain/domain-modules';
import { DomainAvailabilityGuard } from './domain/domain-availability.guard';
import { DisabledDomainFilter } from './domain/disabled-domain.filter';
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
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),
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
      }),
    },
    { provide: APP_GUARD, useClass: DomainAvailabilityGuard },
    { provide: APP_FILTER, useClass: DisabledDomainFilter },
  ],
})
export class AppModule { }
