import { Module } from '@nestjs/common';
import { BrandsRepository } from './repositories/brands.repository';
import { BrandsService } from './services/brands.service';
import { BrandPresenter } from './presenters/brand.presenter';
import { BrandsController } from './controllers/brands.controller';

@Module({
  controllers: [BrandsController],
  providers: [BrandsRepository, BrandsService, BrandPresenter],
  exports: [BrandsService],
})
export class BrandsModule {}
