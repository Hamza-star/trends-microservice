import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AdminGuard } from './roles.authguard';
import { Roles } from '../roles/schema/roles.schema';
import { RequirePermissions } from './permissions.decorator';

describe('AdminGuard', () => {
  it('should deny access when the user lacks a required permission', async () => {
    const rolesModel = {
      findById: jest.fn().mockResolvedValue({
        name: 'Viewer',
        permissions: ['users.read'],
        isSystem: false,
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminGuard,
        Reflector,
        {
          provide: getModelToken(Roles.name),
          useValue: rolesModel,
        },
      ],
    }).compile();

    const guard = moduleRef.get(AdminGuard);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: 'role-id' },
        }),
      }),
      getHandler: () => {
        const descriptor = class {};
        Reflect.defineMetadata('requiredPermissions', ['users.manage'], descriptor);
        return descriptor;
      },
      getClass: () => class {},
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow('Access denied. Missing required permission(s).');
  });
});
