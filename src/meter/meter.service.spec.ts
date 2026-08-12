import { Test, TestingModule } from '@nestjs/testing';
import { MeterService } from './meter.service';

describe('MeterService', () => {
  let service: MeterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeterService],
    }).compile();

    service = module.get<MeterService>(MeterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
