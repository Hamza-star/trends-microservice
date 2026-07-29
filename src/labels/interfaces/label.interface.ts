import { ObjectId } from 'mongodb';

export interface Label {
  _id?: ObjectId;
  name: string;
  key: string;
}
