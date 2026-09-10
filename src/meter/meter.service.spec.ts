import { Test, TestingModule } from '@nestjs/testing';
import { ProjectModelsService } from '../configuration/project-models.service';
import { MeterService } from './meter.service';

describe('MeterService', () => {
  let service: MeterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeterService,
        { provide: ProjectModelsService, useValue: {} },
      ],
    }).compile();

    service = module.get<MeterService>(MeterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
