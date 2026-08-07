import { Test, TestingModule } from '@nestjs/testing';
import { LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';

describe('LabelsController', () => {
  let controller: LabelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LabelsController],
      providers: [
        {
          provide: LabelsService,
          useValue: {
            create: jest.fn(),
            createMany: jest.fn(),
            findAll: jest.fn(),
            findByKey: jest.fn(),
            findById: jest.fn(),
            findByKeys: jest.fn(),
            findByIds: jest.fn(),
            updateByKey: jest.fn(),
            updateById: jest.fn(),
            deleteByKey: jest.fn(),
            deleteById: jest.fn(),
            deleteManyByKeys: jest.fn(),
            deleteManyByIds: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LabelsController>(LabelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
