export class MeterResponse {
  id!: string;

  meterName!: string;

  uniqueKey!: string;

  area!: string;

  infoText?: string;

  status!: boolean;

  createdAt!: Date;

  updatedAt!: Date;

  areaDetails?: any;

  key!: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}