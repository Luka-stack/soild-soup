import { MsPeer } from './ms-peer';

export class MsRoom {
  private peers: Map<string, MsPeer>;

  constructor(public readonly name: string) {
    this.peers = new Map();
  }

  addPeer(peer: MsPeer): void {
    this.peers.set(peer.username, peer);
  }
}
