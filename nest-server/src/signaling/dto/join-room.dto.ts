import { IsBoolean, IsNotEmpty } from 'class-validator';

export class JoinDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  roomName: string;

  @IsBoolean()
  createRoom: boolean;
}
