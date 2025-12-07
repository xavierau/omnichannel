import { IsUUID } from 'class-validator';

/**
 * DTO for adding a channel account to a team.
 */
export class AddChannelAccountDto {
  @IsUUID('4', { message: 'channelAccountId must be a valid UUID' })
  channelAccountId: string;
}
