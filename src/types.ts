import type {
  ConsumerType,
  DtlsParameters,
  IceCandidate,
  IceParameters,
  MediaKind,
  RtpCapabilities,
  RtpParameters,
} from 'mediasoup/node/lib/types';

export interface TransportParams {
  id: string;
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
}

export interface ProduceParams {
  kind: MediaKind;
  transportId: string;
  rtpParameters: RtpParameters;
}

export interface ConsumeParams {
  producerId: string;
  consumerTransportId: string;
  rtpCapabilities: RtpCapabilities;
}

export interface ConsumerParams {
  consumerId: string;
  producerId: string;
  kind: MediaKind;
  type: ConsumerType;
  rtpParameters: RtpParameters;
}
