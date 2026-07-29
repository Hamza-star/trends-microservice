import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MenuService } from './menu.service';

describe('MenuService', () => {
  let service: MenuService;
  const mockMenuModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        {
          provide: getModelToken('Menu'),
          useValue: mockMenuModel,
        },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject invalid parentId values with a bad request error', async () => {
    mockMenuModel.findOne.mockResolvedValue(null);
    mockMenuModel.findById.mockRejectedValue(new Error('Cast to ObjectId failed'));

    await expect(
      service.createMenu({
        title: 'Users',
        type: 'SECTION',
        parentId: 'invalid-id',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
