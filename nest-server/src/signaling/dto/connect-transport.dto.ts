import { IsNotEmpty, IsString } from 'class-validator';
import type { DtlsParameters } from 'mediasoup/node/lib/types';

export class ConnectTransportDto {
  @IsString()
  @IsNotEmpty()
  transportId: string;

  @IsNotEmpty()
  dtlsParameters: DtlsParameters;
}
