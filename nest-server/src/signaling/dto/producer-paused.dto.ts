import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class ProducerPausedDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsBoolean()
  paused: boolean;
}
