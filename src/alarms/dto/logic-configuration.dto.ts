import { IsBoolean } from "class-validator";

export class LogicConfigurationDto {
  @IsBoolean()
  'All-True': boolean;

  @IsBoolean()
  AnyOneTrue: boolean;
}