import { SetMetadata } from '@nestjs/common';
import { PermissionValue } from './permissions.constants';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';

export const RequirePermissions = (...permissions: PermissionValue[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
