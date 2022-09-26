import type {
  ConsumerType,
  DtlsParameters,
  IceCandidate,
  IceParameters,
  MediaKind,
  RtpCapabilities,
  RtpParameters,
} from 'mediasoup/node/lib/types';

export type MediaStreamKind = 'video' | 'audio' | 'screen';

export type SocketException = {
  error: string;
  message: Array<string>;
};

export type TransportParams = {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
};
