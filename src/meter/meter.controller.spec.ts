import { Test, TestingModule } from '@nestjs/testing';
import { MeterController } from './meter.controller';
import { MeterService } from './meter.service';
import { ProjectModelsService } from '../configuration/project-models.service';

describe('MeterController', () => {
  let controller: MeterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeterController],
      providers: [
        MeterService,
        { provide: ProjectModelsService, useValue: {} },
      ],
    }).compile();

    controller = module.get<MeterController>(MeterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
