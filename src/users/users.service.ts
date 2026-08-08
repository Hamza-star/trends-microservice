/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Users, UsersDocument } from './schema/users.schema';
import { Roles, RolesDocument } from '../roles/schema/roles.schema';
import * as bcrypt from 'bcrypt';
import { PrivellegesDocument } from 'src/privelleges/schema/privelleges.schema';
import { AuthorizationPolicy } from '../auth/authorization.policy';
import { PermissionValue } from '../auth/permissions.constants';

interface RoleAssignmentContext {
  userId?: string;
  role?: string;
}

@Injectable()
export class UsersService {
  async resolveDefaultRoleId(): Promise<string | undefined> {
    const superAdminRole = await this.roleModel
      .findOne({ name: { $regex: new RegExp('^SUPER_ADMIN$', 'i') } })
      .select('_id')
      .lean()
      .exec();

    if (superAdminRole?._id) {
      return superAdminRole._id.toString();
    }

    const fallbackRole = await this.roleModel.findOne().select('_id').lean().exec();
    return fallbackRole?._id?.toString();
  }

  async registerUser(email: string, hashedPassword: string, roleId?: string): Promise<Users> {
    const resolvedRoleId = roleId ?? (await this.resolveDefaultRoleId());

    if (!resolvedRoleId) {
      throw new BadRequestException('No role available for user registration');
    }

    if (!Types.ObjectId.isValid(resolvedRoleId)) {
      throw new BadRequestException('Invalid role ID format');
    }

    const roleExists = await this.roleModel.exists({ _id: resolvedRoleId });
    if (!roleExists) {
      throw new BadRequestException('Assigned role does not exist');
    }

    const newUser = new this.userModel({
      email,
      password: hashedPassword,
      role: new Types.ObjectId(resolvedRoleId),
    });

    return newUser.save();
  }
  constructor(
    @InjectModel(Users.name) private userModel: Model<UsersDocument>,
    @InjectModel(Roles.name) private readonly roleModel: Model<RolesDocument>,
    @InjectModel('Privelleges')
    private readonly privellegesModel: Model<PrivellegesDocument>,
    @InjectModel('Menu') private readonly menuModel: Model<any>,
    private readonly authorizationPolicy: AuthorizationPolicy,
  ) {}

  async addUser(
    name: string,
    email: string,
    password: string,
    roleId: string,
    currentUser?: RoleAssignmentContext,
  ): Promise<Users> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Validate role ID format
    if (!Types.ObjectId.isValid(roleId)) {
      throw new BadRequestException('Invalid role ID format');
    }

    const role = await this.roleModel.findById(roleId);
    if (!role) {
      throw new BadRequestException('Role not found');
    }

    const isTargetRoleSuperAdmin = String(role.name ?? '').trim().toUpperCase() === 'SUPER_ADMIN';
    const actorRole = currentUser?.role
      ? await this.roleModel.findById(currentUser.role).select('name').lean().exec()
      : null;
    const isActorSuperAdmin = !!actorRole && String(actorRole.name ?? '').trim().toUpperCase() === 'SUPER_ADMIN';

    if (isTargetRoleSuperAdmin && !isActorSuperAdmin) {
      throw new BadRequestException('Only SUPER_ADMIN can assign SUPER_ADMIN role.');
    }

    if (currentUser?.role) {
      await this.authorizationPolicy.assertCanAssignRoleToUser(
        (Array.isArray(role.permissions) ? role.permissions : []) as PermissionValue[],
        currentUser,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save user
    const newUser = new this.userModel({
      name,
      email,
      password: hashedPassword,
      role: role._id, // store ObjectId reference
      createdBy: currentUser?.userId ? new Types.ObjectId(currentUser.userId) : undefined,
    });

    return newUser.save();
  }

  async findAll(currentUser?: RoleAssignmentContext): Promise<Users[]> {
    if (!currentUser?.userId) {
      return [];
    }

    const actorRole = currentUser.role
      ? await this.roleModel.findById(currentUser.role).select('name').lean().exec()
      : null;

    const isSuperAdmin = actorRole?.name?.toString().trim().toUpperCase() === 'SUPER_ADMIN';

    const query: Record<string, unknown> = {
      _id: { $ne: new Types.ObjectId(currentUser.userId) },
    };

    if (!isSuperAdmin) {
      query.createdBy = new Types.ObjectId(currentUser.userId);
    }

    const users = await this.userModel
      .find(query)
      .populate({
        path: 'role',
      })
      .exec();

    return users;
  }

  // async findById(id: string): Promise<any> {
  //   const user = await this.userModel
  //     .findById(id)
  //     .populate({
  //       path: 'role',
  //       // Remove privelleges populate
  //     })
  //     .exec();

  //   if (!user) throw new NotFoundException('User not found');

  //   // Get role ke saath menuIds
  //   const role = user.role as any;

  //   let menuTree: any[] = [];

  //   // Agar role ke paas menuIds hain to unka tree banao
  //   if (role && role.menuIds && role.menuIds.length > 0) {
  //     // Populate menuIds se poora menu data lao
  //     const menus = await this.menuModel
  //       .find({
  //         _id: { $in: role.menuIds },
  //       })
  //       .lean();

  //     // Collect all menu IDs including ancestors
  //     const allMenuIds = new Set<string>();
  //     const allMenus: any[] = [];

  //     // First, add all assigned menus
  //     for (const menu of menus) {
  //       allMenuIds.add(menu._id.toString());
  //       allMenus.push(menu);

  //       // Fetch and add all ancestors of this menu
  //       if (menu.ancestors && Array.isArray(menu.ancestors)) {
  //         for (const ancestorId of menu.ancestors) {
  //           if (!allMenuIds.has(ancestorId.toString())) {
  //             const ancestorMenu = await this.menuModel
  //               .findById(ancestorId)
  //               .lean();
  //             if (ancestorMenu) {
  //               allMenuIds.add(ancestorId.toString());
  //               allMenus.push(ancestorMenu);
  //             }
  //           }
  //         }
  //       }
  //     }

  //     // Now build tree structure from all collected menus
  //     if (allMenus.length > 0) {
  //       const map = new Map();

  //       // Store all menus in map
  //       allMenus.forEach((menu: any) => {
  //         const cleanMenu = {
  //           _id: menu._id,
  //           title: menu.title,
  //           slug: menu.slug,
  //           type: menu.type,
  //           parentId: menu.parentId,
  //           ancestors: menu.ancestors,
  //           isActive: menu.isActive,
  //           order: menu.order,
  //           children: [],
  //         };
  //         map.set(menu._id.toString(), cleanMenu);
  //       });

  //       // Build tree structure
  //       allMenus.forEach((menu: any) => {
  //         const menuNode = map.get(menu._id.toString());
  //         if (!menu.parentId) {
  //           menuTree.push(menuNode);
  //         } else {
  //           const parent = map.get(menu.parentId.toString());
  //           if (parent) {
  //             parent.children.push(menuNode);
  //           } else {
  //             menuTree.push(menuNode);
  //           }
  //         }
  //       });

  //       // Sort by order
  //       const sortByOrder = (items: any[]) => {
  //         return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  //       };

  //       let sortedTree = sortByOrder(menuTree);

  //       const sortChildrenRecursively = (items: any[]) => {
  //         items.forEach((item: any) => {
  //           if (item.children && item.children.length > 0) {
  //             item.children = sortByOrder(item.children);
  //             sortChildrenRecursively(item.children);
  //           }
  //         });
  //       };

  //       sortChildrenRecursively(sortedTree);
  //       menuTree = sortedTree;
  //     }
  //   }

  //   // Remove createdAt and updatedAt from response if you want
  //   const { createdAt, updatedAt, ...cleanUser } = user;

  //   return {
  //     _id: cleanUser._id,
  //     name: cleanUser.name,
  //     email: cleanUser.email,
  //     role: {
  //       _id: role?._id,
  //       name: role?.name,
  //       menus: menuTree,
  //     },
  //     userStatus: cleanUser.userStatus,
  //   };
  // }

  // async findById(id: string): Promise<any> {
  //   const user = await this.userModel
  //     .findById(id)
  //     .populate({
  //       path: 'role',
  //       // Remove privelleges populate
  //     })
  //     .exec();

  //   if (!user) throw new NotFoundException('User not found');

  //   const role = user.role as any;
  //   let menuTree: any[] = [];

  //   // Agar role ke paas menuIds hain to unka tree banao
  //   if (role && role.menuIds && role.menuIds.length > 0) {
  //     // Populate menuIds se poora menu data lao
  //     const menus = await this.menuModel
  //       .find({
  //         _id: { $in: role.menuIds },
  //       })
  //       .lean();

  //     // Clean menu data - remove extra fields
  //     const map = new Map();

  //     menus.forEach((menu) => {
  //       // Clean each menu item
  //       const cleanedMenu = {
  //         title: menu.title,
  //         slug: menu.slug,
  //         type: menu.type,
  //         order: menu.order,
  //         children: [],
  //       };
  //       map.set(menu._id.toString(), cleanedMenu);
  //     });

  //     // Tree structure banao
  //     menus.forEach((menu) => {
  //       const cleanedMenu = map.get(menu._id.toString());
  //       if (!menu.parentId) {
  //         menuTree.push(cleanedMenu);
  //       } else {
  //         const parent = map.get(menu.parentId.toString());
  //         if (parent) {
  //           parent.children.push(cleanedMenu);
  //         } else {
  //           menuTree.push(cleanedMenu);
  //         }
  //       }
  //     });

  //     // Sort the menu tree by order
  //     const sortByOrder = (items: any[]) => {
  //       return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  //     };

  //     const sortedTree = sortByOrder(menuTree);

  //     const sortChildrenRecursively = (items: any[]) => {
  //       items.forEach((item) => {
  //         if (item.children && item.children.length > 0) {
  //           item.children = sortByOrder(item.children);
  //           sortChildrenRecursively(item.children);
  //         }
  //       });
  //     };

  //     sortChildrenRecursively(sortedTree);
  //     menuTree = sortedTree;
  //   }

  //   // Clean user response - remove extra fields
  //   return {
  //     _id: user._id,
  //     name: user.name,
  //     email: user.email,
  //     role: {
  //       _id: role?._id,
  //       name: role?.name,
  //       menus: menuTree, // Only menus, no privelleges
  //     },
  //     userStatus: user.userStatus,
  //   };
  // }

  async findById(id: string): Promise<any> {
    const user = await this.userModel
      .findById(id)
      .populate({
        path: 'role',
      })
      .exec();

    if (!user) throw new NotFoundException('User not found');

    // Get role ke saath menuIds
    const role = user.role as any;

    let menuTree: any[] = [];

    // Agar role ke paas menuIds hain to unka tree banao
    if (role && role.menuIds && role.menuIds.length > 0) {
      // Populate menuIds se poora menu data lao
      const menus = await this.menuModel
        .find({
          _id: { $in: role.menuIds },
        })
        .lean();

      // Collect all menu IDs including ancestors
      const allMenuIds = new Set<string>();
      const allMenus: any[] = [];

      // First, add all assigned menus
      for (const menu of menus) {
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

      // Now build tree structure from all collected menus
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
    }

    // Remove createdAt and updatedAt from response if you want
    const { createdAt, updatedAt, ...cleanUser } = user;

    return {
      _id: cleanUser._id,
      name: cleanUser.name,
      email: cleanUser.email,
      role: {
        _id: role?._id,
        name: role?.name,
        menus: menuTree,
      },
      userStatus: cleanUser.userStatus,
    };
  }
  async findByEmail(email: string): Promise<Users | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findAuthUserById(id: string): Promise<Users | null> {
    return this.userModel
      .findById(id)
      .select('email role userStatus')
      .exec();
  }

  // async updateUser(
  //   id: string,
  //   updates: Partial<Users>,
  // ): Promise<{ message: string }> {
  //   // Hash the password if it's being updated
  //   if (updates.password) {
  //     updates.password = await bcrypt.hash(updates.password, 10);
  //   }

  //   // Validate role ID if provided
  //   if (updates.role) {
  //     if (!Types.ObjectId.isValid(updates.role.toString())) {
  //       throw new BadRequestException('Invalid role ID format');
  //     }

  //     const roleExists = await this.roleModel.exists({ _id: updates.role });
  //     if (!roleExists) {
  //       throw new BadRequestException(`Role with ID does not exist`);
  //     }
  //   }

  //   // Update the user
  //   const updated = await this.userModel
  //     .findByIdAndUpdate(id, updates, { new: true })
  //     .exec();

  //   if (!updated) {
  //     throw new NotFoundException('User not found');
  //   }

  //   return { message: 'User Updated Successfully' };
  // }

  async updateUser(
    id: string,
    updates: Partial<Users> & { roleId?: string },
    currentUser?: RoleAssignmentContext,
  ): Promise<{ message: string }> {
    const existingUser = await this.userModel.findById(id).exec();
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const targetRole = existingUser.role
      ? await this.roleModel.findById(existingUser.role).select('name').lean().exec()
      : null;
    const isTargetSuperAdmin = !!targetRole && String(targetRole.name ?? '').trim().toUpperCase() === 'SUPER_ADMIN';

    const actorRole = currentUser?.role
      ? await this.roleModel.findById(currentUser.role).select('name').lean().exec()
      : null;
    const isActorSuperAdmin = !!actorRole && String(actorRole.name ?? '').trim().toUpperCase() === 'SUPER_ADMIN';

    if (isTargetSuperAdmin && !isActorSuperAdmin) {
      throw new BadRequestException('Cannot modify SUPER_ADMIN user.');
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    if (updates.roleId) {
      // frontend se roleId aa raha hai

      if (!Types.ObjectId.isValid(updates.roleId)) {
        throw new BadRequestException('Invalid role ID format');
      }

      const role = await this.roleModel.findById(updates.roleId);
      if (!role) {
        throw new BadRequestException('Role does not exist');
      }

      const isNewRoleSuperAdmin = String(role.name ?? '').trim().toUpperCase() === 'SUPER_ADMIN';
      if (isNewRoleSuperAdmin && !isActorSuperAdmin) {
        throw new BadRequestException('Only SUPER_ADMIN can assign SUPER_ADMIN role.');
      }

      if (currentUser?.role) {
        await this.authorizationPolicy.assertCanAssignRoleToUser(
          (Array.isArray(role.permissions) ? role.permissions : []) as PermissionValue[],
          currentUser,
        );
      }

      updates.role = new Types.ObjectId(updates.roleId);

      // remove roleId from updates to avoid unknown field
      delete updates.roleId;
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: 'after' },
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return { message: 'User updated successfully' };
  }

  async deleteUser(_id: string): Promise<{ message: string }> {
    const result = await this.userModel.findByIdAndDelete(_id).exec();
    if (!result) throw new NotFoundException('User not found');
    return { message: `User Deleted` };
  }
}
