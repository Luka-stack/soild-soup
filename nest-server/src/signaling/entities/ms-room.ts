import type {
  DtlsParameters,
  Router,
  RtpCapabilities,
} from 'mediasoup/node/lib/types';
import type { Socket } from 'socket.io';

import { createRouter } from '../../lib/mediasoup/workers';
import { config } from '../../lib/mediasoup/config';
import { MsPeer } from './ms-peer';
import type {
  ConsumeParams,
  PeerConsumer,
  PeerProducer,
  ProduceParams,
  TransportParams,
} from '../../types';

export class MsRoom {
  private peers: Map<string, MsPeer>;
  private router: Router | null;
  private screenSharing = false;

  constructor(public readonly name: string) {
    this.router = null;
    this.peers = new Map();
  }

  addPeer(peer: MsPeer): void {
    this.peers.set(peer.uuid, peer);
  }

  getPeer(peerId: string): MsPeer | undefined {
    return this.peers.get(peerId);
  }

  getPeerProducers(excludePeer = ''): PeerProducer[] {
    const peerProducers: PeerProducer[] = [];

    for (const peer of this.peers.values()) {
      if (peer.uuid === excludePeer) continue;
      peerProducers.push(peer.getPeerProducer());
    }

    return peerProducers;
  }

  async getRouterCapabilities(): Promise<RtpCapabilities> {
    if (!this.router) {
      this.router = await createRouter();
    }

    return this.router.rtpCapabilities;
  }

  async createWebRtcTransport(peerId: string): Promise<TransportParams> {
    if (!this.peers.has(peerId)) {
      throw new Error('User is not connected');
    }

    const { maxIncomingBitrate, initialAvailableOutgoingBitrate, listenIps } =
      config.mediasoup.webRtcTransport;

    const transport = await this.router.createWebRtcTransport({
      listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate,
    });

    if (maxIncomingBitrate) {
      try {
        await transport.setMaxIncomingBitrate(maxIncomingBitrate);
      } catch (error) {
        console.log(
          '--- [CreateWebRtcTransport] error while setting maxIncomingBitrate ---',
          error,
        );
      }
    }

    transport.on('dtlsstatechange', (dtlsState: string) => {
      if (dtlsState === 'closed') {
        console.log(`--- [Transport ${transport.id}] dtls state closed ---`);
        transport.close();
      }
    });

    this.peers.get(peerId).addTransport(transport);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(
    peerId: string,
    params: { transportId: string; dtlsParameters: DtlsParameters },
  ): Promise<void> {
    if (!this.peers.has(peerId)) {
      throw new Error('User not connected');
    }

    await this.peers.get(peerId).connectTransport(params);
  }

  produce(peerId: string, params: ProduceParams): Promise<PeerProducer> {
    if (params.appData.kind === 'screen' && this.screenSharing) {
      throw new Error('Cannot share another screen');
    }

    const peer = this.peers.get(peerId);

    if (!peer) {
      throw new Error('User not connected');
    }

    return peer.createProducer(params);
  }

  async consume(socket: Socket, params: ConsumeParams): Promise<PeerConsumer> {
    if (!this.peers.has(socket.data.peerId)) {
      throw new Error('User not connected');
    }

    if (
      !this.router.canConsume({
        producerId: params.producerId,
        rtpCapabilities: params.rtpCapabilities,
      })
    ) {
      throw new Error(`Cannot consume ${params.appData.kind}`);
    }

    const consumer = await this.peers
      .get(socket.data.peerId)
      .createConsumer(params);

    consumer.on('producerclose', () => {
      this.peers.get(socket.data.peerId).removeConsumer(consumer.id);

      socket.emit('producer_closed', {
        peerId: consumer.appData.peerId,
        kind: consumer.appData.kind,
        consumerId: consumer.id,
      });
    });

    return {
      consumerId: consumer.id,
      producerId: params.producerId,
      kind: consumer.kind,
      type: consumer.type,
      rtpParameters: consumer.rtpParameters,
    };
  }
}
