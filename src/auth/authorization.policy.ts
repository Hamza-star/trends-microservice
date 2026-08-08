import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Roles, RolesDocument } from '../roles/schema/roles.schema';
import { PermissionValue } from './permissions.constants';

@Injectable()
export class AuthorizationPolicy {
  constructor(
    @InjectModel(Roles.name)
    private readonly rolesModel: Model<RolesDocument>,
  ) {}

  async assertHasPermissions(
    requiredPermissions: PermissionValue[],
    currentUser?: { role?: string },
  ): Promise<void> {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return;
    }

    if (!currentUser?.role) {
      throw new ForbiddenException('No role found in token.');
    }

    const role = await this.rolesModel.findById(currentUser.role);
    if (!role) {
      throw new ForbiddenException('Invalid role.');
    }

    const permissions = Array.isArray(role.permissions) ? role.permissions : [];
    const hasAllRequiredPermissions = requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );

    if (!hasAllRequiredPermissions) {
      throw new ForbiddenException('Access denied. Missing required permission(s).');
    }
  }

  async assertCanAssignRolePermissions(
    targetPermissions: PermissionValue[],
    currentUser?: { role?: string },
  ): Promise<void> {
    if (!currentUser?.role) {
      throw new BadRequestException('Actor role is required.');
    }

    const actorRole = await this.rolesModel.findById(currentUser.role);
    if (!actorRole) {
      throw new BadRequestException('Actor role not found');
    }

    const actorPermissions = Array.isArray(actorRole.permissions) ? actorRole.permissions : [];
    const hasAllPermissions = targetPermissions.every((permission) =>
      actorPermissions.includes(permission),
    );

    if (!hasAllPermissions && !this.isSuperAdmin(actorRole.name)) {
      throw new BadRequestException('You cannot assign permissions you do not possess.');
    }
  }

  async assertCanAssignRoleToUser(
    targetPermissions: PermissionValue[],
    currentUser?: { role?: string },
  ): Promise<void> {
    return this.assertCanAssignRolePermissions(targetPermissions, currentUser);
  }

  async assertRoleModifiable(role: RolesDocument, currentUser?: { userId?: string; role?: string }): Promise<void> {
    const actorRole = currentUser?.role ? await this.rolesModel.findById(currentUser.role) : null;
    const isActorSuperAdmin = !!actorRole && this.isSuperAdmin(actorRole.name);

    if (this.isSuperAdmin(role.name) && !isActorSuperAdmin) {
      throw new BadRequestException('SUPER_ADMIN role can only be modified by SUPER_ADMIN.');
    }

    if (role.isSystem && !isActorSuperAdmin) {
      throw new BadRequestException('System roles can only be modified by SUPER_ADMIN.');
    }

    if (role.createdBy && currentUser?.userId && role.createdBy.toString() !== currentUser.userId && !isActorSuperAdmin) {
      if (!actorRole || !this.isSuperAdmin(actorRole.name)) {
        throw new BadRequestException('You can only edit roles you created.');
      }
    }
  }

  private isSuperAdmin(roleName?: string): boolean {
    return String(roleName ?? '').trim().toUpperCase() === 'SUPER_ADMIN';
  }
}
