/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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

  async createMenu(dto: CreateMenuDto) {
    const title = this.normalizeTitle(dto.title);
    const slug = await this.buildSlug(dto.slug, title);

    if (!title) {
      throw new BadRequestException('Title is required');
    }

    await this.ensureUniqueSlug(slug);

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
      });
    }

    const resolvedParent = await this.resolveParent(dto.parentId, dto.type);
    const parentId = resolvedParent.parentId;
    const parent = resolvedParent.parent;

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
    });
  }

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
    const nextSlug =
      dto.slug !== undefined ? this.normalizeSlug(dto.slug) : undefined;

    if (dto.title !== undefined && !nextTitle) {
      throw new BadRequestException('Title is required');
    }

    if (dto.slug !== undefined && !nextSlug) {
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
        nextParentId = resolvedParent.parentId;
        nextAncestors = [...(resolvedParent.parent.ancestors ?? []), resolvedParent.parent._id];
      }
    }

    if (dto.title !== undefined && nextTitle !== menu.title) {
      await this.ensureUniqueTitle(nextTitle, nextParentId, id);
    }

    if (dto.slug !== undefined && nextSlug !== undefined && nextSlug !== menu.slug) {
      await this.ensureUniqueSlug(nextSlug, id);
    }

    if (dto.order !== undefined && dto.order !== menu.order) {
      await this.ensureUniqueOrder(dto.order, nextParentId, id);
    }

    let slug = menu.slug;
    if (dto.title !== undefined && dto.slug === undefined && nextTitle !== menu.title) {
      slug = this.generateSlug(nextTitle);
      slug = await this.generateUniqueSlug(slug, id);
    } else if (dto.slug !== undefined && nextSlug !== undefined) {
      slug = nextSlug;
    }

    const updateData: Partial<MenuDocument> = {
      title: dto.title !== undefined ? nextTitle : menu.title,
      slug,
      type: dto.type ?? menu.type,
      parentId: nextParentId,
      ancestors: nextAncestors,
      order: dto.order ?? menu.order,
    };

    const updated = await this.menuModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updated) {
      throw new NotFoundException('Menu not found');
    }

    if (dto.parentId !== undefined) {
      await this.propagateAncestorUpdates(updated._id, updated.ancestors ?? []);
    }

    return updated;
  }

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

  async getMenuTree() {
    const menus = await this.menuModel.find().lean();

    const map = new Map<string, Record<string, any>>();

    menus.forEach((menu) => {
      map.set(menu._id.toString(), {
        ...menu,
        children: [],
      });
    });

    const tree: Record<string, any>[] = [];

    menus.forEach((menu) => {
      const current = map.get(menu._id.toString());
      if (!current) {
        return;
      }

      if (!menu.parentId) {
        tree.push(current);
      } else {
        const parent = map.get(menu.parentId.toString());
        if (parent) {
          parent.children.push(current);
        }
      }
    });

    const sortByOrder = (items: Record<string, any>[]) => {
      return items.sort((a, b) => (a.order || 0) - (b.order || 0));
    };

    const sortedTree = sortByOrder(tree);

    const sortChildrenRecursively = (items: Record<string, any>[]) => {
      items.forEach((item) => {
        if (item.children && item.children.length > 0) {
          item.children = sortByOrder(item.children);
          sortChildrenRecursively(item.children);
        }
      });
    };

    sortChildrenRecursively(sortedTree);

    const removeUnwantedFields = (items: Record<string, any>[]) => {
      return items.map((item) => {
        const { createdAt, updatedAt, __v, ...cleanItem } = item;
        if (cleanItem.children && cleanItem.children.length > 0) {
          cleanItem.children = removeUnwantedFields(cleanItem.children);
        }
        return cleanItem;
      });
    };

    return removeUnwantedFields(sortedTree);
  }

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

  private async buildSlug(slug: string | undefined, title: string): Promise<string> {
    if (slug) {
      const normalizedSlug = this.normalizeSlug(slug);
      if (!normalizedSlug) {
        throw new BadRequestException('Slug is required');
      }
      return normalizedSlug;
    }

    return this.generateSlug(title);
  }

  private async generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (await this.menuModel.findOne({ slug: uniqueSlug, _id: { $ne: excludeId ?? undefined } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return uniqueSlug;
  }

  private async ensureUniqueTitle(
    title: string,
    parentId: Types.ObjectId | null,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.menuModel.findOne({
      title,
      parentId: parentId ?? null,
      _id: { $ne: excludeId ?? undefined },
    });

    if (existing) {
      const parentName = parentId ? 'under parent' : 'at root level';
      throw new BadRequestException(
        `Menu with title '${title}' already exists ${parentName}`,
      );
    }
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string): Promise<void> {
    const existing = await this.menuModel.findOne({
      slug,
      _id: { $ne: excludeId ?? undefined },
    });

    if (existing) {
      throw new BadRequestException(`Slug '${slug}' already exists`);
    }
  }

  private async ensureUniqueOrder(
    order: number,
    parentId: Types.ObjectId | null,
    excludeId?: string,
  ): Promise<void> {
    const existingOrder = await this.menuModel.findOne({
      parentId: parentId ?? null,
      order,
      _id: { $ne: excludeId ?? undefined },
    });

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
      parentId: parent._id,
      parent,
    };
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
      await this.menuModel.findByIdAndUpdate(child._id, {
        ancestors: childAncestors,
      });
      await this.propagateAncestorUpdates(child._id, childAncestors);
    }
  }
}
