import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ collection: 'projects', timestamps: true })
export class Project {
  @Prop({ required: true, unique: true, trim: true })
  projectId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  databaseName: string;

  @Prop({ type: [String], default: [] })
  nodeRedUrls: string[];

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);