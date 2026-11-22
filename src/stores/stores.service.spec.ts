import { Test, TestingModule } from '@nestjs/testing';
import { StoresService } from './stores.service';
import { StoresRepository } from './stores.repository';
import { MerchantsRepository } from '../merchants/merchants.repository';

describe('StoresService', () => {
  let service: StoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        { provide: StoresRepository, useValue: {} },
        { provide: MerchantsRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
