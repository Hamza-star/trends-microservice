export const Permission = {
  ROLES_MANAGE: 'roles.manage',
  USERS_MANAGE: 'users.manage',
  USERS_READ: 'users.read',
  ROLES_READ: 'roles.read',
  MENU_MANAGE: 'menu.manage',
  MENU_READ: 'menu.read',
  LABELS_MANAGE: 'labels.manage',
  LABELS_READ: 'labels.read',
  PERMISSIONS_MANAGE: 'permissions.manage',
  PERMISSIONS_READ: 'permissions.read',
} as const;

export type PermissionValue = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: PermissionValue[] = Object.values(Permission);
