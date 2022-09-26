import type {
  DtlsParameters,
  Router,
  RtpCapabilities,
} from 'mediasoup/node/lib/types';
import { createRouter } from '../../lib/mediasoup/workers';
import { config } from '../../lib/mediasoup/config';

import { MsPeer } from './ms-peer';
import { TransportParams } from 'src/types';

export class MsRoom {
  private peers: Map<string, MsPeer>;
  private router: Router | null;
  private screenSharing = false;

  constructor(public readonly name: string) {
    this.router = null;
    this.peers = new Map();
  }

  addPeer(peer: MsPeer): void {
    this.peers.set(peer.username, peer);
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

  // TODO Add params type
  async produce(peerId: string, params: any): Promise<string> {
    if (params.appData.kind === 'screen' && this.screenSharing) {
      throw new Error('Cannot share another screen');
    }

    if (!this.peers.has(peerId)) {
      throw new Error('User not connected');
    }

    const producer = await this.peers.get(peerId).createProducer(params);

    return producer.id;
  }
}
