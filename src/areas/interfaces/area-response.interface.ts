export class AreaResponse {
  id!: string;

  name!: string;

  parentId!: string | null;

  level!: number;

  path!: string[];

  children?: AreaResponse[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}