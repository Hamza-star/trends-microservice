import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;

  beforeEach(async () => {
    mockAuthService = {
      signup: jest.fn(),
      forgotPasswordWithBackupCode: jest.fn(),
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      logoutAllDevices: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates forgotPasswordWithBackupCode to authService', async () => {
    const dto = {
      email: 'user@example.com',
      backupCode: '84920153',
      newPassword: 'NewPassword123!',
    };
    const expectedResponse = { message: 'Password reset successfully' };
    mockAuthService.forgotPasswordWithBackupCode.mockResolvedValue(expectedResponse);

    const response = await controller.forgotPasswordWithBackupCode(dto);

    expect(mockAuthService.forgotPasswordWithBackupCode).toHaveBeenCalledWith(dto);
    expect(response).toEqual(expectedResponse);
  });
});
