import type {
  ActiveSpeakerObserver,
  AudioLevelObserver,
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
  private server: any;
  private speaking: string | null = null;

  private audioLevelObserver: AudioLevelObserver | null = null;

  constructor(public readonly name: string) {
    this.router = null;
    this.peers = new Map();
  }

  setServer(server: any) {
    this.server = server;
  }

  addPeer(peer: MsPeer): void {
    this.peers.set(peer.uuid, peer);
  }

  getPeer(peerId: string): MsPeer | undefined {
    return this.peers.get(peerId);
  }

  getPeersNumber(): number {
    return this.peers.size;
  }

  getPeerProducers(excludePeer = ''): PeerProducer[] {
    const peerProducers: PeerProducer[] = [];

    for (const peer of this.peers.values()) {
      if (peer.uuid === excludePeer) continue;
      peerProducers.push(peer.getPeerProducer());
    }

    return peerProducers;
  }

  removePeer(peerId: any) {
    if (!this.peers.get(peerId)) {
      console.log(`--- [RemovePeer] peer ${peerId} not found ---`);
      return;
    }

    this.peers.get(peerId).close();
    this.peers.delete(peerId);
  }

  async getRouterCapabilities(): Promise<RtpCapabilities> {
    if (!this.router) {
      this.router = await createRouter();
      this.audioLevelObserver = await this.router.createAudioLevelObserver({
        maxEntries: 1,
        threshold: -70,
        interval: 1000,
      });

      this.audioLevelObserver.on('volumes', (volumes) => {
        if (this.speaking === volumes[0].producer.appData.peerId) {
          return;
        }

        this.speaking = volumes[0].producer.appData.peerId as string;
        this.server?.to(this.name).emit('speaking', this.speaking);
      });

      this.audioLevelObserver.on('silence', () => {
        this.speaking = null;
        this.server?.to(this.name).emit('silence');
      });
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

  connectTransport(
    peerId: string,
    params: { transportId: string; dtlsParameters: DtlsParameters },
  ) {
    if (!this.peers.has(peerId)) {
      throw new Error('User not connected');
    }

    this.peers.get(peerId).connectTransport(params);
  }

  async produce(peerId: string, params: ProduceParams): Promise<PeerProducer> {
    if (params.appData.kind === 'screen' && this.screenSharing) {
      throw new Error('Cannot share another screen');
    }

    const peer = this.peers.get(peerId);

    if (!peer) {
      throw new Error('User not connected');
    }

    const data = await peer.createProducer(params);

    if (params.appData.kind === 'audio') {
      this.audioLevelObserver.addProducer({ producerId: data.producers[0].id });
    }

    return data;
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

  pauseProducer(peerId: string, id: string, paused: boolean) {
    if (!this.peers.has(peerId)) {
      throw new Error('User not connected');
    }

    console.log('--- [PauseProducer] producer paused', paused, '---');

    if (paused) {
      this.peers.get(peerId).pauseProducer(id);
    } else {
      this.peers.get(peerId).resumeProducer(id);
    }
  }

  closeProducer(peerId: any, kind: string) {
    if (!this.peers.has(peerId)) {
      throw new Error('User not connected');
    }

    const producerId = this.peers.get(peerId).closeProducer(kind);
    this.audioLevelObserver.removeProducer({ producerId });
  }
}
