import mediasoup, { createWorker } from 'mediasoup';
import type { Router, RtpCapabilities } from 'mediasoup/node/lib/types';
import { MsPeer } from './ms-peer';
import { createRouter } from './ms-router';

export class MsRoom {
  private _peers: Map<string, MsPeer>;
  private _router!: Router;

  constructor(public readonly name: string) {
    this._peers = new Map();
    this.initRouter();
  }

  addPeer(peer: MsPeer): void {
    this._peers.set(peer.socketId, peer);
  }

  getRouterCapabilities(): RtpCapabilities {
    return this._router.rtpCapabilities;
  }

  private async initRouter() {
    this._router = await createRouter();
  }
}
