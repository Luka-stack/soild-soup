import { IsNotEmpty, IsString } from 'class-validator';
import type { RtpCapabilities } from 'mediasoup/node/lib/types';
import { MediaStreamKind } from '../../types';

export class ConsumeDto {
  @IsNotEmpty()
  @IsString()
  producerId: string;

  @IsNotEmpty()
  @IsString()
  transportId: string;

  @IsNotEmpty()
  rtpCapabilities: RtpCapabilities;

  @IsNotEmpty()
  appData: {
    peerId: string;
    kind: MediaStreamKind;
  };
}
