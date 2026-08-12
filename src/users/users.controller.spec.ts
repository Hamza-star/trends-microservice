import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.authguard';
import { PermissionGuard } from '../auth/roles.authguard';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: any;

  beforeEach(async () => {
    mockUsersService = {
      updateProfile: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      addUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateProfile', () => {
    it('throws BadRequestException if user is not authenticated in request', () => {
      expect(() => controller.updateProfile({ user: undefined } as any, {})).toThrow(
        BadRequestException,
      );
    });

    it('delegates to usersService.updateProfile when authenticated', async () => {
      const mockResult = { message: 'Profile updated successfully', user: {} };
      mockUsersService.updateProfile.mockResolvedValue(mockResult);

      const req = { user: { userId: '507f1f77bcf86cd799439011' } };
      const dto = { name: 'John Updated' };

      const response = await controller.updateProfile(req as any, dto);

      expect(mockUsersService.updateProfile).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        dto,
      );
      expect(response).toEqual(mockResult);
    });
  });
});
