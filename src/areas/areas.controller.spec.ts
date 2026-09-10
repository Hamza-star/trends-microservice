import { Test, TestingModule } from '@nestjs/testing';
import { AreaController } from './areas.controller';
import { AreaService } from './areas.service';
import { ProjectModelsService } from '../configuration/project-models.service';

describe('AreaController', () => {
  let controller: AreaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AreaController],
      providers: [
        AreaService,
        { provide: ProjectModelsService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AreaController>(AreaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
