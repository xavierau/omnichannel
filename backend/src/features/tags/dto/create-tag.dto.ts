import { IsString, IsEnum, MinLength, MaxLength } from 'class-validator';
import { TagColor } from '../tag.entity';

export class CreateTagDto {
  @IsString()
  @MinLength(1, { message: 'Tag name must be at least 1 character' })
  @MaxLength(100, { message: 'Tag name must not exceed 100 characters' })
  name: string;

  @IsEnum(TagColor, { message: 'Invalid tag color' })
  color: TagColor;
}
