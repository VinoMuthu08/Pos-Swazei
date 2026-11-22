import { Test, TestingModule } from '@nestjs/testing';
import { MerchantsService } from './merchants.service';
import { MerchantsRepository } from './merchants.repository';

describe('MerchantsService', () => {
  let service: MerchantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantsService,
        { provide: MerchantsRepository, useValue: {} },
      ],
    }).compile();

    service = module.get<MerchantsService>(MerchantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
