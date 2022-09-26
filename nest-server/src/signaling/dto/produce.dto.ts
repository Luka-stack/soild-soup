import { IsNotEmpty, IsString } from 'class-validator';
import type { MediaKind, RtpParameters } from 'mediasoup/node/lib/types';

import { MediaStreamKind } from '../../types';

export class ProduceDto {
  @IsNotEmpty()
  @IsString()
  transportId: string;

  @IsNotEmpty()
  @IsString()
  kind: MediaKind;

  @IsNotEmpty()
  rtpParameters: RtpParameters;

  @IsNotEmpty()
  appData: { kind: MediaStreamKind };
}
