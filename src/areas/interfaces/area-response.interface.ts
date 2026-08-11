export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  // timestamp: string;
}

export interface AreaResponse {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  path: string[];
  // createdAt: Date;
  // updatedAt: Date;
  children?: AreaResponse[];
}