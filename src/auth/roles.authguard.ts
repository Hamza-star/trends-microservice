import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from './permissions.decorator';
import { AuthorizationPolicy } from './authorization.policy';
import { PermissionValue } from './permissions.constants';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationPolicy: AuthorizationPolicy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionValue[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];

    await this.authorizationPolicy.assertHasPermissions(requiredPermissions, request.user);

    return true;
  }
}
