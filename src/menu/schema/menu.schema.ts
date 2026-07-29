// menu/schema/menu.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MenuDocument = HydratedDocument<Menu>;

@Schema({ timestamps: true })
export class Menu {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true, unique: true })
  slug!: string;

  @Prop({
    required: true,
    enum: ['TAB', 'SECTION', 'SUBSECTION', 'PAGE'],
  })
  type!: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Menu',
    default: null,
  })
  parentId!: Types.ObjectId | null;

  @Prop({
    type: [Types.ObjectId],
    default: [],
  })
  ancestors!: Types.ObjectId[];

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: 0 })
  order!: number;

  @Prop({
    type: String,
    default: null,
  })
  icon!: string | null;
}

export const MenuSchema = SchemaFactory.createForClass(Menu);

// --- Uniqueness enforced at the DB level (removes race-condition risk) ---

// Same order cannot repeat under the same parent (including root, parentId: null)
MenuSchema.index({ parentId: 1, order: 1 }, { unique: true });

// Same title cannot repeat under the same parent
MenuSchema.index({ parentId: 1, title: 1 }, { unique: true });

// --- Query performance ---

// Speeds up "find all descendants of X" (ancestors: X) tree lookups
MenuSchema.index({ ancestors: 1 });

// NOTE: removed the standalone { parentId: 1 } index — it was redundant,
// since { parentId: 1, order: 1 } already serves parentId-only queries
// as a prefix index.