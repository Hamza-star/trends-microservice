import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Key can only contain lowercase letters, numbers, and underscores',
  })
  key!: string;
}
