import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { PrivellegesService } from './privelleges.service';

describe('PrivellegesService', () => {
  let service: PrivellegesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivellegesService,
        {
          provide: getModelToken('Privelleges'),
          useValue: {
            find: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
            updateMany: jest.fn(),
          },
        },
        {
          provide: getModelToken('Roles'),
          useValue: {
            updateMany: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PrivellegesService>(PrivellegesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
