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

export type ProduceParams = {
  kind: MediaKind;
  transportId: string;
  rtpParameters: RtpParameters;
  appData: {
    kind: MediaStreamKind;
  };
};

export type ConsumeParams = {
  producerId: string;
  transportId: string;
  rtpCapabilities: RtpCapabilities;
  appData: {
    peerId: string;
    kind: MediaStreamKind;
  };
};

export type PeerConsumer = {
  consumerId: string;
  producerId: string;
  kind: MediaKind;
  type: ConsumerType;
  rtpParameters: RtpParameters;
};

export type PeerProducer = {
  peerId: string;
  name: string;
  producers: {
    id: string;
    kind: MediaStreamKind;
  }[];
};
