import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { REQUIRED_PERMISSIONS_KEY } from './permissions.decorator';
import { Roles, RolesDocument } from 'src/roles/schema/roles.schema';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(Roles.name)
    private readonly rolesModel: Model<RolesDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];

    if (!user?.role) {
      throw new ForbiddenException('No role found in token.');
    }

    const role = await this.rolesModel.findById(user.role);
    if (!role) {
      throw new ForbiddenException('Invalid role.');
    }

    const permissions = Array.isArray(role.permissions) ? role.permissions : [];
    const hasAllRequiredPermissions = requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );

    if (requiredPermissions.length > 0 && !hasAllRequiredPermissions) {
      throw new ForbiddenException('Access denied. Missing required permission(s).');
    }

    if (requiredPermissions.length === 0 && role.name !== 'SUPER_ADMIN' && role.isSystem) {
      throw new ForbiddenException('Access denied.');
    }

    return true;
  }
}
