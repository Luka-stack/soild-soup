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
  appData: {
    kind: MediaStreamKind;
  };
}

export interface ConsumeParams {
  producerId: string;
  consumerTransportId: string;
  rtpCapabilities: RtpCapabilities;
  appData: {
    peerId: string;
  };
}

export interface ConsumerParams {
  consumerId: string;
  producerId: string;
  kind: MediaKind;
  type: ConsumerType;
  rtpParameters: RtpParameters;
}

export interface JoinRoomPayload {
  roomName: string;
  username: string;
  createRoom: boolean;
}
