import { Test, TestingModule } from '@nestjs/testing';
import { ProjectModelsService } from '../configuration/project-models.service';
import { AreaService } from './areas.service';

describe('AreaService', () => {
  let service: AreaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreaService,
        { provide: ProjectModelsService, useValue: {} },
      ],
    }).compile();

    service = module.get<AreaService>(AreaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
