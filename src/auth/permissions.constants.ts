export const Permission = {
  ROLES_MANAGE: 'roles.manage',
  ROLES_CREATE: 'roles.create',
  ROLES_READ: 'roles.read',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',

  USERS_MANAGE: 'users.manage',
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  MENU_MANAGE: 'menu.manage',
  MENU_CREATE: 'menu.create',
  MENU_READ: 'menu.read',
  MENU_UPDATE: 'menu.update',
  MENU_DELETE: 'menu.delete',

  LABELS_MANAGE: 'labels.manage',
  LABELS_CREATE: 'labels.create',
  LABELS_READ: 'labels.read',
  LABELS_UPDATE: 'labels.update',
  LABELS_DELETE: 'labels.delete',

  PERMISSIONS_MANAGE: 'permissions.manage',
  PERMISSIONS_CREATE: 'permissions.create',
  PERMISSIONS_READ: 'permissions.read',
  PERMISSIONS_UPDATE: 'permissions.update',
  PERMISSIONS_DELETE: 'permissions.delete',
} as const;

export type PermissionValue = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS: PermissionValue[] = Object.values(Permission);
