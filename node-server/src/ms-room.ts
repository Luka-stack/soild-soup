import type {
  AudioLevelObserver,
  DtlsParameters,
  Router,
  RtpCapabilities,
} from 'mediasoup/node/lib/types';

import { MsPeer } from './ms-peer';
import { createRouter } from './ms-router';
import { config } from './mediasoup-config';
import {
  ConsumeParams,
  ConsumerParams,
  MediaStreamKind,
  ProduceParams,
  TransportParams,
} from './types';
import { Server } from 'socket.io';

export class MsRoom {
  private peers: Map<string, MsPeer>;
  private router: Router | null;
  private screenSharing = false;
  private audioLevelObserver: AudioLevelObserver | null = null;
  private speaking: string | null = null;

  constructor(public readonly name: string, private readonly server: Server) {
    this.router = null;
    this.peers = new Map();
  }

  addPeer(peer: MsPeer): void {
    this.peers.set(peer.id, peer);

    console.log('--- [MsRoom]:addPeer user', peer.name, 'added ---');
  }

  getPeersNumber(): number {
    return this.peers.size;
  }

  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);

    if (!peer) {
      console.log(`--- [RemovePeer] peer ${peerId} not found ---`);
      return;
    }

    peer.close();
    this.peers.delete(peer.id);
    this.broadcast('', 'participant_left', peer.uuid);
  }

  async createWebRtcTransport(peerId: string): Promise<TransportParams> {
    const peer = this.peers.get(peerId);

    if (!peer) {
      console.log(`--- [CreateWebRtcTransport] peer ${peerId} not found ---`);
      throw new Error('Peer not found');
    }

    const { maxIncomingBitrate, initialAvailableOutgoingBitrate, listenIps } =
      config.mediasoup.webRtcTransport;

    const transport = await this.router!.createWebRtcTransport({
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
          error
        );
      }
    }

    transport.on('dtlsstatechange', (dtlsState: string) => {
      if (dtlsState === 'closed') {
        console.log(`--- [Transport ${transport.id}] dtls state closed ---`);
        transport.close();
      }
    });

    peer.addTransport(transport);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(
    peerId: string,
    params: { transportId: string; dtlsParameters: DtlsParameters }
  ): Promise<void> {
    const peer = this.peers.get(peerId);

    if (!peer) {
      console.log(`--- [ConnectTransport] peer ${peerId} not found ---`);
      throw new Error('Peer not found');
    }

    try {
      await peer.connectTransport(params);
    } catch (error) {
      throw error;
    }
  }

  async produce(peerId: string, params: ProduceParams): Promise<string> {
    if (params.appData.kind === 'screen' && this.screenSharing) {
      console.log(`--- [Produce] screen is already sharing ---`);
      throw new Error('Cannot share another screen');
    }

    const peer = this.peers.get(peerId);

    if (!peer) {
      console.log(`--- [Produce] peer ${peerId} not found ---`);
      throw new Error('Peer not found');
    }

    const producer = await peer.createProducer(params);

    console.log(
      `--- [MsRoom]:produce; created producer ${producer.id} for ${peerId}, ${params.appData.kind} ---`
    );

    if (params.appData.kind === 'audio') {
      this.audioLevelObserver!.addProducer({
        producerId: producer.id,
      });
    }

    return producer.id;
  }

  async consume(
    peerId: string,
    params: ConsumeParams
  ): Promise<ConsumerParams> {
    const peer = this.peers.get(peerId);

    if (!peer) {
      console.log(`--- [Consume] peer ${peerId} not found ---`);
      throw new Error('Peer not found');
    }

    if (
      !this.router!.canConsume({
        producerId: params.producerId,
        rtpCapabilities: params.rtpCapabilities,
      })
    ) {
      console.log('--- [Consume] cannot consume ---');
      throw new Error('Consume cannot consume');
    }

    const consumer = await this.peers.get(peerId)!.createConsumer(params);

    consumer.on('producerclose', () => {
      console.log('--- [Consumer] producer closed ---');

      peer.removeConsumer(consumer.id);

      this.server.to(peerId).emit('producer_closed', {
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

  async getRouterCapabilities(): Promise<RtpCapabilities> {
    if (!this.router) {
      await this.initRouter();
      await this.initObservers();
    }

    return this.router!.rtpCapabilities;
  }

  private async initObservers() {
    this.audioLevelObserver = await this.router!.createAudioLevelObserver({
      maxEntries: 1,
      threshold: -70,
      interval: 1000,
    });

    this.audioLevelObserver.on('volumes', (volumes) => {
      if (this.speaking === volumes[0].producer.appData.peerId) {
        return;
      }

      this.speaking = volumes[0].producer.appData.peerId as string;
      this.server.to(this.name).emit('speaking', this.speaking);
    });

    this.audioLevelObserver.on('silence', () => {
      this.speaking = null;
      this.server.to(this.name).emit('silence');
    });
  }

  private async initRouter() {
    this.router = await createRouter();
    console.log('--- [MsRoom]:initRouter router initialized ---');
  }

  broadcast(id: string, type: string, data: any) {
    for (let peer of this.peers.values()) {
      if (peer.id === id) continue;

      this.server.to(peer.id).emit(type, data);
    }
  }

  broadcastProducer(id: string, producerId: string, kind: MediaStreamKind) {
    const peer = this.peers.get(id);

    if (!peer) return;

    const message = {
      peerId: peer.uuid,
      name: peer.name,
      producers: [
        {
          id: producerId,
          kind,
        },
      ],
    };

    this.broadcast(id, 'new_producers', [message]);
  }

  sendProducers(id: string) {
    const producerList = [];

    for (let peer of this.peers.values()) {
      if (peer.id === id) continue;
      producerList.push({
        peerId: peer.uuid,
        name: peer.name,
        producers: peer.getProducers(),
      });
    }

    this.server.to(id).emit('new_producers', producerList);
  }

  pauseProducer(id: string, producerId: string, paused: boolean) {
    const peer = this.peers.get(id);
    if (!peer) return;

    console.log('--- [PauseProducer] producer paused', paused, '---');

    if (paused) {
      peer.pauseProducer(producerId);
    } else {
      peer.resumeProducer(producerId);
    }

    this.broadcast(id, 'participant_mutation', { peerId: peer.uuid, paused });
  }

  closeProducer(id: string, kind: MediaStreamKind) {
    const peer = this.peers.get(id);
    if (!peer) return;

    const producerId = peer.closeProducer(kind);
    this.audioLevelObserver!.removeProducer({ producerId });
  }
}
