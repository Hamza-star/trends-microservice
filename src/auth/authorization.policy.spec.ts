import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuthorizationPolicy } from './authorization.policy';
import { Roles } from '../roles/schema/roles.schema';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('AuthorizationPolicy', () => {
  let service: AuthorizationPolicy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationPolicy,
        {
          provide: getModelToken(Roles.name),
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthorizationPolicy>(AuthorizationPolicy);
  });

  it('allows access when the role has all required permissions', async () => {
    const rolesModel = service['rolesModel'];
    (rolesModel.findById as jest.Mock).mockResolvedValue({
      name: 'Viewer',
      permissions: ['users.read', 'menu.read'],
      isSystem: false,
    });

    await expect(
      service.assertHasPermissions(['users.read'], { role: 'role-id' }),
    ).resolves.toBeUndefined();
  });

  it('rejects access when the role lacks a required permission', async () => {
    const rolesModel = service['rolesModel'];
    (rolesModel.findById as jest.Mock).mockResolvedValue({
      name: 'Viewer',
      permissions: ['users.read'],
      isSystem: false,
    });

    await expect(
      service.assertHasPermissions(['users.manage'], { role: 'role-id' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows create/read/update/delete when the role has manage permission for that resource', async () => {
    const rolesModel = service['rolesModel'];
    (rolesModel.findById as jest.Mock).mockResolvedValue({
      name: 'Admin',
      permissions: ['users.manage'],
      isSystem: false,
    });

    await expect(
      service.assertHasPermissions(['users.create'], { role: 'role-id' }),
    ).resolves.toBeUndefined();

    await expect(
      service.assertHasPermissions(['users.update'], { role: 'role-id' }),
    ).resolves.toBeUndefined();

    await expect(
      service.assertHasPermissions(['users.delete'], { role: 'role-id' }),
    ).resolves.toBeUndefined();
  });

  it('blocks assigning permissions the actor does not possess', async () => {
    const rolesModel = service['rolesModel'];
    (rolesModel.findById as jest.Mock).mockResolvedValue({
      name: 'Viewer',
      permissions: ['users.read'],
      isSystem: false,
    });

    await expect(
      service.assertCanAssignRolePermissions(['users.manage'], { role: 'role-id' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
