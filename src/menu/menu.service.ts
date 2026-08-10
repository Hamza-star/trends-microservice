import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { CreateMenuDto } from './schema/dto/create-menu.dto';
import { UpdateMenuDto } from './schema/dto/update-menu.dto';
import { MenuDocument } from './schema/menu.schema';

type MenuType = 'TAB' | 'SECTION' | 'SUBSECTION' | 'PAGE';

export interface MenuTreeNode {
  _id?: Types.ObjectId;
  title: string;
  slug: string;
  type: MenuType;
  parentId: Types.ObjectId | null;
  ancestors: Types.ObjectId[];
  isActive: boolean;
  order: number;
  icon?: string | null;
  children: MenuTreeNode[];
  [key: string]: unknown;
}

@Injectable()
export class MenuService {
  private readonly validParentMap: Record<MenuType, MenuType[]> = {
    TAB: [],
    SECTION: ['TAB'],
    SUBSECTION: ['SECTION'],
    PAGE: ['TAB', 'SECTION', 'SUBSECTION'],
  };

  constructor(
    @InjectModel('Menu')
    private readonly menuModel: Model<MenuDocument>,
  ) {}

  // ---------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------
  async createMenu(dto: CreateMenuDto) {
    const title = this.normalizeTitle(dto.title);
    if (!title) {
      throw new BadRequestException('Title is required');
    }

    const slug = await this.buildSlugForCreate(dto.slug, title);

    if (!dto.parentId) {
      if (dto.type !== 'TAB') {
        throw new BadRequestException('Only TAB can be created without parent');
      }

      await this.ensureUniqueTitle(title, null);

      const order = await this.resolveOrder(dto.order, null);

      return this.menuModel.create({
        title,
        slug,
        type: dto.type,
        parentId: null,
        ancestors: [],
        isActive: true,
        order,
        icon: dto.icon ?? null,
      });
    }

    const { parentId, parent } = await this.resolveParent(dto.parentId, dto.type);

    if (!parent || !parentId) {
      throw new NotFoundException('Parent not found');
    }

    await this.ensureUniqueTitle(title, parentId);

    const order = await this.resolveOrder(dto.order, parentId);

    return this.menuModel.create({
      title,
      slug,
      type: dto.type,
      parentId,
      ancestors: [...(parent.ancestors ?? []), parent._id],
      isActive: true,
      order,
      icon: dto.icon ?? null,
    });
  }

  // ---------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------
  async getAllMenus() {
    return this.menuModel.find().sort({ createdAt: 1 });
  }

  async getMenuById(id: string) {
    this.ensureValidObjectId(id, 'Menu id');
    const menu = await this.menuModel.findById(id);

    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    return menu;
  }

  // ---------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------
  
  async updateMenu(id: string, dto: UpdateMenuDto) {
  this.ensureValidObjectId(id, 'Menu id');

  const menu = await this.menuModel.findById(id);
  if (!menu) {
    throw new NotFoundException('Menu not found');
  }

  const nextType = (dto.type ?? menu.type) as MenuType;
  const validTypes: MenuType[] = ['TAB', 'SECTION', 'SUBSECTION', 'PAGE'];
  if (!validTypes.includes(nextType)) {
    throw new BadRequestException('Invalid menu type');
  }

  const nextTitle =
    dto.title !== undefined ? this.normalizeTitle(dto.title) : menu.title;

  if (dto.title !== undefined && !nextTitle) {
    throw new BadRequestException('Title is required');
  }

  if (dto.slug !== undefined && !this.normalizeSlug(dto.slug)) {
    throw new BadRequestException('Slug is required');
  }

  let nextParentId: Types.ObjectId | null = menu.parentId ?? null;
  let nextAncestors: Types.ObjectId[] = menu.ancestors ?? [];

  if (dto.parentId !== undefined) {
    if (dto.parentId === null || dto.parentId === '') {
      if (nextType !== 'TAB') {
        throw new BadRequestException('Only TAB can be at root level');
      }
      nextParentId = null;
      nextAncestors = [];
    } else {
      const resolvedParent = await this.resolveParent(dto.parentId, nextType);
      if (!resolvedParent.parentId || !resolvedParent.parent) {
        throw new NotFoundException('Parent not found');
      }

      this.ensureNoCycle(id, resolvedParent.parent);

      nextParentId = resolvedParent.parentId;
      nextAncestors = [
        ...(resolvedParent.parent.ancestors ?? []),
        resolvedParent.parent._id,
      ];
    }
  } else if (dto.type !== undefined && dto.type !== menu.type) {
    if (!menu.parentId) {
      if (nextType !== 'TAB') {
        throw new BadRequestException(
          'Only TAB can exist without a parent; provide a parentId to change type',
        );
      }
    } else {
      const currentParent = await this.menuModel.findById(menu.parentId);
      if (!currentParent) {
        throw new NotFoundException('Existing parent not found');
      }
      const allowedParents = this.validParentMap[nextType];
      if (!allowedParents?.includes(currentParent.type as MenuType)) {
        throw new BadRequestException(
          `${nextType} cannot exist under ${currentParent.type}; provide a new parentId`,
        );
      }
    }
  }

  if (dto.title !== undefined && nextTitle !== menu.title) {
    await this.ensureUniqueTitle(nextTitle, nextParentId, id);
  }

  if (dto.order !== undefined && dto.order !== menu.order) {
    await this.ensureUniqueOrder(dto.order, nextParentId, id);
  }

  let slug = menu.slug;
  if (dto.slug !== undefined) {
    const normalizedSlug = this.normalizeSlug(dto.slug);
    if (normalizedSlug !== menu.slug) {
      await this.ensureUniqueSlug(normalizedSlug, id);
    }
    slug = normalizedSlug;
  } else if (dto.title !== undefined && nextTitle !== menu.title) {
    const base = this.generateSlug(nextTitle);
    slug = await this.generateUniqueSlug(base, id);
  }

  const updateData: Partial<MenuDocument> = {
    title: dto.title !== undefined ? nextTitle : menu.title,
    slug,
    type: nextType,
    parentId: nextParentId,
    ancestors: nextAncestors,
    order: dto.order ?? menu.order,
    icon: dto.icon !== undefined ? dto.icon : menu.icon,
  };

  const updated = await this.menuModel.findByIdAndUpdate(id, updateData, {
    returnDocument: 'after',
  });

  if (!updated) {
    throw new NotFoundException('Menu not found');
  }

  if (dto.parentId !== undefined) {
    await this.propagateAncestorUpdates(updated._id, updated.ancestors ?? []);
  }

  return updated;
}

  // ---------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------
  async deleteMenu(id: string) {
    this.ensureValidObjectId(id, 'Menu id');

    const menu = await this.menuModel.findById(id);
    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    const children = await this.menuModel.countDocuments({ parentId: id });
    if (children > 0) {
      throw new BadRequestException('Delete child menus first');
    }

    await this.menuModel.findByIdAndDelete(id);

    return {
      message: 'Menu deleted successfully',
    };
  }

  // ---------------------------------------------------------------------
  // TREE
  // ---------------------------------------------------------------------
  async getMenuTree(): Promise<MenuTreeNode[]> {
    const menus = await this.menuModel.find().lean<MenuTreeNode[]>();

    const map = new Map<string, MenuTreeNode>();

    menus.forEach((menu) => {
      map.set(menu._id!.toString(), { ...menu, children: [] });
    });

    const tree: MenuTreeNode[] = [];

    menus.forEach((menu) => {
      const current = map.get(menu._id!.toString());
      if (!current) return;

      if (!menu.parentId) {
        tree.push(current);
      } else {
        const parent = map.get(menu.parentId.toString());
        if (parent) {
          parent.children.push(current);
        }
      }
    });

    const sortByOrder = (items: MenuTreeNode[]) =>
      items.sort((a, b) => (a.order || 0) - (b.order || 0));

    const sortChildrenRecursively = (items: MenuTreeNode[]) => {
      items.forEach((item) => {
        if (item.children.length > 0) {
          item.children = sortByOrder(item.children);
          sortChildrenRecursively(item.children);
        }
      });
    };

    const sortedTree = sortByOrder(tree);
    sortChildrenRecursively(sortedTree);

    const removeUnwantedFields = (items: MenuTreeNode[]): MenuTreeNode[] =>
      items.map((item) => {
        const { createdAt, updatedAt, __v, ...cleanItem } = item as MenuTreeNode &
          Record<string, unknown>;
        return {
          ...cleanItem,
          children: removeUnwantedFields(cleanItem.children as MenuTreeNode[]),
        } as MenuTreeNode;
      });

    return removeUnwantedFields(sortedTree);
  }

  // ---------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------
  private normalizeTitle(title: string): string {
    return title.trim();
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private generateSlug(title: string): string {
    return title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Create-time slug resolution:
   * - explicit slug provided -> normalize, uniqueness checked by caller (throws on collision)
   * - no slug provided -> auto-generate from title AND auto-suffix on collision
   */
  private async buildSlugForCreate(
    slug: string | undefined,
    title: string,
  ): Promise<string> {
    if (slug) {
      const normalizedSlug = this.normalizeSlug(slug);
      if (!normalizedSlug) {
        throw new BadRequestException('Slug is required');
      }
      await this.ensureUniqueSlug(normalizedSlug);
      return normalizedSlug;
    }

    const base = this.generateSlug(title);
    return this.generateUniqueSlug(base);
  }

  private async generateUniqueSlug(
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let uniqueSlug = baseSlug;
    let counter = 1;

    // eslint-disable-next-line no-await-in-loop
    while (await this.findBySlug(uniqueSlug, excludeId)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return uniqueSlug;
  }

  private async findBySlug(slug: string, excludeId?: string) {
    const filter: Record<string, unknown> = { slug };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    return this.menuModel.findOne(filter);
  }

  private async ensureUniqueTitle(
    title: string,
    parentId: Types.ObjectId | null,
    excludeId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      title,
      parentId: parentId ?? null,
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const existing = await this.menuModel.findOne(filter);

    if (existing) {
      const parentName = parentId ? 'under parent' : 'at root level';
      throw new BadRequestException(
        `Menu with title '${title}' already exists ${parentName}`,
      );
    }
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string): Promise<void> {
    const existing = await this.findBySlug(slug, excludeId);

    if (existing) {
      throw new BadRequestException(`Slug '${slug}' already exists`);
    }
  }

  private async ensureUniqueOrder(
    order: number,
    parentId: Types.ObjectId | null,
    excludeId?: string,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      parentId: parentId ?? null,
      order,
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const existingOrder = await this.menuModel.findOne(filter);

    if (existingOrder) {
      throw new BadRequestException(
        `Order ${order} already exists under this parent`,
      );
    }
  }

  private async resolveOrder(
    providedOrder: number | undefined,
    parentId: Types.ObjectId | null,
  ): Promise<number> {
    if (providedOrder !== undefined) {
      await this.ensureUniqueOrder(providedOrder, parentId);
      return providedOrder;
    }

    const lastMenu = await this.menuModel
      .findOne({ parentId: parentId ?? null })
      .sort({ order: -1 });

    return lastMenu ? lastMenu.order + 1 : 1;
  }

  private async resolveParent(
    parentId: string,
    menuType: MenuType,
  ): Promise<{ parentId: Types.ObjectId | null; parent: MenuDocument | null }> {
    if (!isValidObjectId(parentId)) {
      throw new BadRequestException('Invalid parentId');
    }

    const parent = await this.menuModel.findById(parentId);
    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    const allowedParents = this.validParentMap[menuType];
    if (!allowedParents?.includes(parent.type as MenuType)) {
      throw new BadRequestException(
        `${menuType} cannot be created under ${parent.type}`,
      );
    }

    return {
      parentId: parent._id as Types.ObjectId,
      parent,
    };
  }

  /**
   * Prevents moving a node under itself or under one of its own descendants,
   * which would otherwise create an infinite ancestor chain.
   */
  private ensureNoCycle(nodeId: string, newParent: MenuDocument): void {
    if (newParent._id.toString() === nodeId) {
      throw new BadRequestException('A menu cannot be its own parent');
    }

    const parentAncestorIds = (newParent.ancestors ?? []).map((a) =>
      a.toString(),
    );

    if (parentAncestorIds.includes(nodeId)) {
      throw new BadRequestException(
        'Cannot move a menu under one of its own descendants',
      );
    }
  }

  private ensureValidObjectId(id: string, fieldName: string): void {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
  }

  private async propagateAncestorUpdates(
    menuId: Types.ObjectId,
    ancestors: Types.ObjectId[],
  ): Promise<void> {
    const children = await this.menuModel.find({ parentId: menuId });

    for (const child of children) {
      const childAncestors = [...ancestors, menuId];
      // eslint-disable-next-line no-await-in-loop
      await this.menuModel.findByIdAndUpdate(child._id, {
        ancestors: childAncestors,
      });
      // eslint-disable-next-line no-await-in-loop
      await this.propagateAncestorUpdates(child._id as Types.ObjectId, childAncestors);
    }
  }
}