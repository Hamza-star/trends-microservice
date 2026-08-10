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

    const hasPermission = (requiredPermission: PermissionValue): boolean => {
      if (permissions.includes(requiredPermission)) {
        return true;
      }

      const [resource, action] = requiredPermission.split('.') as [string, string];
      if (action !== 'manage' && permissions.includes(`${resource}.manage` as PermissionValue)) {
        return true;
      }

      return false;
    };

    const hasAllRequiredPermissions = requiredPermissions.every(hasPermission);

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

    if (!hasAllPermissions && !this.isSuperAdmin(actorRole.code)) {
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
    const isActorSuperAdmin = !!actorRole && this.isSuperAdmin(actorRole.code);

    if (this.isSuperAdmin(role.code) && !isActorSuperAdmin) {
      throw new BadRequestException('SUPER_ADMIN role can only be modified by SUPER_ADMIN.');
    }

    if (role.isSystem && !isActorSuperAdmin) {
      throw new BadRequestException('System roles can only be modified by SUPER_ADMIN.');
    }

    if (role.createdBy && currentUser?.userId && role.createdBy.toString() !== currentUser.userId && !isActorSuperAdmin) {
      if (!actorRole || !this.isSuperAdmin(actorRole.code)) {
        throw new BadRequestException('You can only edit roles you created.');
      }
    }
  }

  private isSuperAdmin(roleCode?: string): boolean {
    return String(roleCode ?? '').trim().toUpperCase() === 'SUPER_ADMIN';
  }
}
