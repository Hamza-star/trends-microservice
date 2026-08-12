import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { Users } from './schema/users.schema';
import { Roles } from '../roles/schema/roles.schema';
import { AuthorizationPolicy } from '../auth/authorization.policy';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: any;
  let mockRoleModel: any;

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      exists: jest.fn(),
    };

    mockRoleModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(Users.name), useValue: mockUserModel },
        { provide: getModelToken(Roles.name), useValue: mockRoleModel },
        { provide: getModelToken('Privelleges'), useValue: {} },
        { provide: getModelToken('Menu'), useValue: {} },
        { provide: AuthorizationPolicy, useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateProfile', () => {
    const userId = '507f1f77bcf86cd799439011';

    it('throws NotFoundException if user does not exist', async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateProfile(userId, { name: 'New Name' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException if currentPassword is missing when updating password', async () => {
      const mockUser = {
        _id: userId,
        email: 'user@example.com',
        password: 'hashedPassword',
      };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        service.updateProfile(userId, { newPassword: 'NewPassword123!' }),
      ).rejects.toThrow('Current password is required to update email or password');
    });

    it('throws BadRequestException if currentPassword is invalid', async () => {
      const mockUser = {
        _id: userId,
        email: 'user@example.com',
        password: await bcrypt.hash('CorrectPassword123!', 10),
      };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        service.updateProfile(userId, {
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow('Invalid current password');
    });

    it('throws BadRequestException if new email is already in use by another user', async () => {
      const mockUser = {
        _id: userId,
        email: 'old@example.com',
        password: await bcrypt.hash('Password123!', 10),
      };
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      mockUserModel.findOne.mockResolvedValue({ _id: 'anotherUserId' });

      await expect(
        service.updateProfile(userId, {
          email: 'taken@example.com',
          currentPassword: 'Password123!',
        }),
      ).rejects.toThrow('Email already in use');
    });

    it('successfully updates profile name, email, and password', async () => {
      const hashedPassword = await bcrypt.hash('OldPassword123!', 10);
      const mockUser: any = {
        _id: userId,
        name: 'Old Name',
        email: 'old@example.com',
        password: hashedPassword,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      mockUserModel.findOne.mockResolvedValue(null);

      jest.spyOn(service, 'findById').mockResolvedValue({
        _id: userId,
        name: 'New Name',
        email: 'new@example.com',
      } as any);

      const result = await service.updateProfile(userId, {
        name: 'New Name',
        email: 'new@example.com',
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(mockUser.name).toBe('New Name');
      expect(mockUser.email).toBe('new@example.com');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.message).toBe('Profile updated successfully');
      expect(result.user).toBeDefined();
    });
  });

  describe('saveBackupCodes', () => {
    it('updates backup codes in database', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const codes = ['12345678', '87654321'];

      mockUserModel.findByIdAndUpdate.mockResolvedValue(true);

      await service.saveBackupCodes(userId, codes);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, {
        $set: {
          backupCodes: [
            { code: '12345678', used: false, usedAt: null },
            { code: '87654321', used: false, usedAt: null },
          ],
        },
      });
    });
  });
});
