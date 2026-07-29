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

      const result: any[] = [];

      for (const role of roles) {
        // Collect all menu IDs including ancestors
        const allMenuIds = new Set<string>();
        const allMenus: any[] = [];

        if (role.menuIds && Array.isArray(role.menuIds)) {
          // First, add all assigned menus
          for (const menu of role.menuIds) {
            allMenuIds.add(menu._id.toString());
            allMenus.push(menu);

            // Fetch and add all ancestors of this menu
            if (menu.ancestors && Array.isArray(menu.ancestors)) {
              for (const ancestorId of menu.ancestors) {
                if (!allMenuIds.has(ancestorId.toString())) {
                  const ancestorMenu = await this.menuModel
                    .findById(ancestorId)
                    .lean();
                  if (ancestorMenu) {
                    allMenuIds.add(ancestorId.toString());
                    allMenus.push(ancestorMenu);
                  }
                }
              }
            }
          }
        }

        // Now build tree structure from all collected menus
        let menuTree: any[] = [];

        if (allMenus.length > 0) {
          const map = new Map();

          // Store all menus in map
          allMenus.forEach((menu: any) => {
            const cleanMenu = {
              _id: menu._id,
              title: menu.title,
              slug: menu.slug,
              type: menu.type,
              parentId: menu.parentId,
              ancestors: menu.ancestors,
              isActive: menu.isActive,
              order: menu.order,
              children: [],
            };
            map.set(menu._id.toString(), cleanMenu);
          });

          // Build tree structure
          allMenus.forEach((menu: any) => {
            const menuNode = map.get(menu._id.toString());
            if (!menu.parentId) {
              menuTree.push(menuNode);
            } else {
              const parent = map.get(menu.parentId.toString());
              if (parent) {
                parent.children.push(menuNode);
              } else {
                menuTree.push(menuNode);
              }
            }
          });

          // Sort by order
          const sortByOrder = (items: any[]) => {
            return items.sort((a, b) => (a.order || 0) - (b.order || 0));
          };

          let sortedTree = sortByOrder(menuTree);

          const sortChildrenRecursively = (items: any[]) => {
            items.forEach((item: any) => {
              if (item.children && item.children.length > 0) {
                item.children = sortByOrder(item.children);
                sortChildrenRecursively(item.children);
              }
            });
          };

          sortChildrenRecursively(sortedTree);
          menuTree = sortedTree;
        }

        result.push({
          _id: role._id,
          name: role.name,
          menus: menuTree,
        });
      }

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
