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
import { PrivellegesDocument } from 'src/privelleges/schema/privelleges.schema';

interface PopulatedMenu {
  _id: Types.ObjectId;
  title: string;
  type: string;
  ancestors: Types.ObjectId[];
  route?: string;
  isActive?: boolean;
}

interface PopulatedRole {
  _id: Types.ObjectId;
  name: string;
  menuIds: PopulatedMenu[];
}

interface MenuItem {
  _id: Types.ObjectId;
  title: string;
  type: string;
  path: Array<{
    _id: any;
    title: any;
    type: any;
  }>;
}
@Injectable()
export class RolesService {
  findByName: any;
  constructor(
    @InjectModel('Roles')
    private readonly rolesModel: Model<RolesDocument>,
    @InjectModel('Users')
    private readonly usersModel: Model<UsersDocument>,
    // @InjectModel('Privelleges')
    // private readonly privellegesModel: Model<PrivellegesDocument>,
    @InjectModel('Menu')
    private readonly menuModel: Model<any>,
  ) {}

  
  
  async createRoleWithMenus(name: string, menuIds: string[]): Promise<Roles> {
    // Check for duplicate role name
    const existingRole = await this.rolesModel.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });

    if (existingRole) {
      throw new BadRequestException(`Role with name '${name}' already exists`);
    }

    // Validate menu IDs exist
    const menusFromDB = await this.menuModel.find({
      _id: { $in: menuIds },
    });

    if (menusFromDB.length !== menuIds.length) {
      throw new BadRequestException('One or more menus not found');
    }

    // Create role with name and menuIds
    const newRole = new this.rolesModel({
      name: name,
      menuIds: menusFromDB.map((menu) => menu._id),
    });

    return newRole.save();
  }

  async updateRoleWithMenus(
    id: string,
    name: string,
    menuIds?: string[],
  ): Promise<{ message: string; data?: any }> {
    const updateData: any = { name };

    // If menuIds are provided, validate and update them
    if (menuIds && Array.isArray(menuIds)) {
      // Remove duplicates from menuIds array if any
      const uniqueMenuIds = [...new Set(menuIds)];

      // Validate all menu IDs exist in database
      const menusFromDB = await this.menuModel.find({
        _id: { $in: uniqueMenuIds },
      });

      if (menusFromDB.length !== uniqueMenuIds.length) {
        throw new BadRequestException('One or more menus not found');
      }

      // Directly assign new menuIds (replace old ones)
      updateData.menuIds = menusFromDB.map((menu) => menu._id);
    }

    const role = await this.rolesModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return {
      message: 'Role updated successfully',
      data: role,
    };
  }

  async assignMenusToRole(roleId: string, menuIds: string[]): Promise<Roles> {
    const role = await this.rolesModel.findById(roleId);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const menus = await this.menuModel.find({
      _id: { $in: menuIds },
    });

    if (menus.length !== menuIds.length) {
      throw new BadRequestException('One or more menus not found');
    }

    role.menuIds = menus.map((menu) => menu._id);

    await role.save();

    return role;
  }

 async getAllRoles() {
  try {
    const roles = await this.rolesModel
      .find()
      .populate<{ menuIds: any[] }>('menuIds')
      .lean();

    if (!roles || roles.length === 0) {
      return [];
    }

    // 1. Build a global menu cache from all populated (assigned) menus first
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

    // 2. Fetch ALL missing ancestors in a single query instead of one-by-one
    if (missingAncestorIds.size > 0) {
      const ancestorMenus = await this.menuModel
        .find({ _id: { $in: Array.from(missingAncestorIds) } })
        .lean();

      for (const menu of ancestorMenus) {
        menuCache.set(menu._id.toString(), menu);
      }
    }

    // 3. Helper: build tree for a given list of menu ids (assigned + ancestors)
    const sortByOrder = (items: any[]) =>
      items.sort((a, b) => (a.order || 0) - (b.order || 0));

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

    // 4. Build result per role using only the cache (no DB calls here)
    const result = roles.map((role) => {
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
        menus: allMenuIds.size > 0 ? buildMenuTree(allMenuIds) : [],
      };
    });

    return result;
  } catch (error) {
    console.error('Error in getAllRoles:', error);
    throw new Error(`Failed to get roles: ${error.message}`);
  }
}

  async getRoleByIdAndUpdate(
    id: string,
    name: string,
  ): Promise<{ message: string }> {
    const role = await this.rolesModel
      .findByIdAndUpdate(id, { name }, { new: true })
      .exec();

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return { message: 'Role updated successfully' };
  }

  async getRoleByIdAndDelete(id: string): Promise<{ message: string }> {
    const roleObjectId = Types.ObjectId.isValid(id)
      ? new Types.ObjectId(id)
      : id;

    const usersWithRole = await this.usersModel.countDocuments({
      $or: [{ role: roleObjectId }, { role: id }], // check both string and ObjectId
    });

    if (usersWithRole > 0) {
      throw new BadRequestException(
        `Cannot delete role. ${usersWithRole} user(s) are using this role.`,
      );
    }

    const role = await this.rolesModel.findByIdAndDelete(roleObjectId).exec();

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    return { message: 'Role deleted successfully' };
  }

  async makeRoleAdmin(roleId: string, isAdmin: boolean): Promise<Roles> {
    const role = await this.rolesModel.findByIdAndUpdate(
      roleId,
      { isAdmin },
      { new: true },
    );

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    return role;
  }
}
