/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Roles, RolesDocument } from './schema/roles.schema';
import { UsersDocument } from 'src/users/schema/users.schema';

interface PopulatedMenu {
  _id: Types.ObjectId;
  title: string;
  type: string;
  ancestors: Types.ObjectId[];
  route?: string;
  isActive?: boolean;
}

@Injectable()
export class RolesService {
  constructor(
    @InjectModel('Roles')
    private readonly rolesModel: Model<RolesDocument>,
    @InjectModel('Users')
    private readonly usersModel: Model<UsersDocument>,
    @InjectModel('Menu')
    private readonly menuModel: Model<any>,
  ) {}

  async createRoleWithPermissions(
    name: string,
    permissions: string[],
    currentUser?: { userId?: string; role?: string },
    menuIds?: string[],
  ): Promise<Roles> {
    const existingRole = await this.rolesModel.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });

    if (existingRole) {
      throw new BadRequestException(`Role with name '${name}' already exists`);
    }

    const normalizedPermissions = [...new Set((permissions ?? []).filter(Boolean))];

    if (currentUser?.role) {
      const actorRole = await this.rolesModel.findById(currentUser.role);
      if (!actorRole) {
        throw new BadRequestException('Actor role not found');
      }

      const actorPermissions = Array.isArray(actorRole.permissions) ? actorRole.permissions : [];
      const hasAllPermissions = normalizedPermissions.every((permission) =>
        actorPermissions.includes(permission),
      );

      if (!hasAllPermissions && actorRole.name !== 'SUPER_ADMIN') {
        throw new BadRequestException('You cannot create a role with permissions you do not possess.');
      }
    }

    const normalizedMenuIds = [...new Set((menuIds ?? []).filter(Boolean))].map((menuId) => new Types.ObjectId(menuId));

    const newRole = new this.rolesModel({
      name,
      permissions: normalizedPermissions,
      menuIds: normalizedMenuIds,
      createdBy: currentUser?.userId ? new Types.ObjectId(currentUser.userId) : undefined,
    });

    return newRole.save();
  }

  async updateRoleWithPermissions(
    id: string,
    name?: string,
    permissions?: string[],
    currentUser?: { userId?: string; role?: string },
    menuIds?: string[],
  ): Promise<{ message: string; data?: any }> {
    const role = await this.rolesModel.findById(id);

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (role.isSystem && currentUser?.role) {
      const actorRole = await this.rolesModel.findById(currentUser.role);
      if (actorRole?.name !== 'SUPER_ADMIN') {
        throw new BadRequestException('System roles can only be modified by SUPER_ADMIN.');
      }
    }

    if (role.createdBy && currentUser?.userId && role.createdBy.toString() !== currentUser.userId) {
      const actorRole = await this.rolesModel.findById(currentUser.role);
      if (actorRole?.name !== 'SUPER_ADMIN') {
        throw new BadRequestException('You can only edit roles you created.');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      updateData.name = name;
    }

    if (permissions !== undefined) {
      const normalizedPermissions = [...new Set((permissions ?? []).filter(Boolean))];

      if (currentUser?.role) {
        const actorRole = await this.rolesModel.findById(currentUser.role);
        const actorPermissions = Array.isArray(actorRole?.permissions) ? actorRole.permissions : [];
        const hasAllPermissions = normalizedPermissions.every((permission) =>
          actorPermissions.includes(permission),
        );

        if (!hasAllPermissions && actorRole?.name !== 'SUPER_ADMIN') {
          throw new BadRequestException('You cannot update a role with permissions you do not possess.');
        }
      }

      updateData.permissions = normalizedPermissions;
    }

    if (menuIds !== undefined) {
      updateData.menuIds = [...new Set((menuIds ?? []).filter(Boolean))].map((menuId) => new Types.ObjectId(menuId));
    }

    const updatedRole = await this.rolesModel.findByIdAndUpdate(id, updateData, { new: true }).exec();

    if (!updatedRole) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return {
      message: 'Role updated successfully',
      data: updatedRole,
    };
  }

  async assignPermissionsToRole(
    roleId: string,
    permissions: string[],
    currentUser?: { userId?: string; role?: string },
  ): Promise<Roles> {
    const role = await this.rolesModel.findById(roleId);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const normalizedPermissions = [...new Set((permissions ?? []).filter(Boolean))];

    if (currentUser?.role) {
      const actorRole = await this.rolesModel.findById(currentUser.role);
      const actorPermissions = Array.isArray(actorRole?.permissions) ? actorRole.permissions : [];
      const hasAllPermissions = normalizedPermissions.every((permission) =>
        actorPermissions.includes(permission),
      );

      if (!hasAllPermissions && actorRole?.name !== 'SUPER_ADMIN') {
        throw new BadRequestException('You cannot assign permissions you do not possess.');
      }
    }

    role.permissions = normalizedPermissions;
    await role.save();

    return role;
  }

  async getAllRoles() {
    try {
      const roles = await this.rolesModel.find().populate<{ menuIds: any[] }>('menuIds').lean();

      if (!roles || roles.length === 0) {
        return [];
      }

      const menuCache = new Map<string, any>();
      const missingAncestorIds = new Set<string>();

      for (const role of roles) {
        if (!role.menuIds || !Array.isArray(role.menuIds)) continue;

        for (const menu of role.menuIds) {
          const id = menu._id.toString();
          if (!menuCache.has(id)) {
            menuCache.set(id, menu);
          }

          if (menu.ancestors && Array.isArray(menu.ancestors)) {
            for (const ancestorId of menu.ancestors) {
              const aId = ancestorId.toString();
              if (!menuCache.has(aId)) {
                missingAncestorIds.add(aId);
              }
            }
          }
        }
      }

      if (missingAncestorIds.size > 0) {
        const ancestorMenus = await this.menuModel.find({ _id: { $in: Array.from(missingAncestorIds) } }).lean();

        for (const menu of ancestorMenus) {
          menuCache.set(menu._id.toString(), menu);
        }
      }

      const sortByOrder = (items: any[]) => items.sort((a, b) => (a.order || 0) - (b.order || 0));

      const sortChildrenRecursively = (items: any[]) => {
        for (const item of items) {
          if (item.children && item.children.length > 0) {
            item.children = sortByOrder(item.children);
            sortChildrenRecursively(item.children);
          }
        }
      };

      const buildMenuTree = (allMenuIds: Set<string>) => {
        const map = new Map<string, any>();

        for (const id of allMenuIds) {
          const menu = menuCache.get(id);
          if (!menu) continue;
          map.set(id, {
            _id: menu._id,
            title: menu.title,
            slug: menu.slug,
            type: menu.type,
            parentId: menu.parentId,
            ancestors: menu.ancestors,
            isActive: menu.isActive,
            order: menu.order,
            children: [],
          });
        }

        let tree: any[] = [];
        for (const id of allMenuIds) {
          const node = map.get(id);
          if (!node) continue;
          const menu = menuCache.get(id);
          if (!menu.parentId) {
            tree.push(node);
          } else {
            const parent = map.get(menu.parentId.toString());
            if (parent) {
              parent.children.push(node);
            } else {
              tree.push(node);
            }
          }
        }

        tree = sortByOrder(tree);
        sortChildrenRecursively(tree);
        return tree;
      };

      return roles.map((role) => {
        const allMenuIds = new Set<string>();

        if (role.menuIds && Array.isArray(role.menuIds)) {
          for (const menu of role.menuIds) {
            const id = menu._id.toString();
            allMenuIds.add(id);
            if (menu.ancestors && Array.isArray(menu.ancestors)) {
              for (const ancestorId of menu.ancestors) {
                allMenuIds.add(ancestorId.toString());
              }
            }
          }
        }

        return {
          _id: role._id,
          name: role.name,
          permissions: role.permissions,
          isSystem: role.isSystem,
          createdBy: role.createdBy,
          menuIds: role.menuIds,
          menuTree: buildMenuTree(allMenuIds),
        };
      });
    } catch {
      return [];
    }
  }

  async getRoleByIdAndDelete(id: string): Promise<{ message: string }> {
    const roleObjectId = Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id;

    const usersWithRole = await this.usersModel.countDocuments({
      $or: [{ role: roleObjectId }, { role: id }],
    });

    if (usersWithRole > 0) {
      throw new BadRequestException(`Cannot delete role. ${usersWithRole} user(s) are using this role.`);
    }

    const role = await this.rolesModel.findByIdAndDelete(roleObjectId).exec();

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    return { message: 'Role deleted successfully' };
  }
}
