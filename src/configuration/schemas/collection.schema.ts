import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CollectionDocument = HydratedDocument<ProjectCollection>;

@Schema({ collection: 'project_collections', timestamps: true })
export class ProjectCollection {
  @Prop({ required: true, trim: true, index: true })
  projectId: string;

  @Prop({ required: true, trim: true })
  collectionName: string;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const ProjectCollectionSchema = SchemaFactory.createForClass(ProjectCollection);
ProjectCollectionSchema.index(
  { projectId: 1, collectionName: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);