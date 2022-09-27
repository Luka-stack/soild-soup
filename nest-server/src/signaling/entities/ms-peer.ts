import type {
  Consumer,
  DtlsParameters,
  Producer,
  Transport,
} from 'mediasoup/node/lib/types';
import { v4 as uuidv4 } from 'uuid';

import { ConsumeParams, PeerProducer, ProduceParams } from '../../types';

export class MsPeer {
  public readonly uuid: string;
  private transports: Map<string, Transport>;
  private producers: Map<string, Producer>;
  private consumers: Map<string, Consumer>;

  constructor(
    public readonly socketId: string,
    public readonly username: string,
  ) {
    this.uuid = uuidv4();
    this.transports = new Map();
    this.producers = new Map();
    this.consumers = new Map();
  }

  addTransport(transport: Transport): void {
    if (this.transports.has(transport.id)) {
      console.log(
        `--- [AddTransport] transport ${transport.id} already assigned ---`,
      );
      return;
    }

    console.log('--- [MsPeer]:addTransport transport', transport.id, 'added');
    this.transports.set(transport.id, transport);
  }

  getPeerProducer(): PeerProducer {
    const producers = [];

    for (const producer of this.producers.values()) {
      producers.push({
        id: producer.id,
        kind: producer.appData.kind,
      });
    }

    return {
      peerId: this.uuid,
      name: this.username,
      producers,
    };
  }

  removeConsumer(id: string): void {
    this.consumers.get(id)?.close();
    this.consumers.delete(id);
  }

  async connectTransport(params: {
    transportId: string;
    dtlsParameters: DtlsParameters;
  }): Promise<void> {
    if (!this.transports.has(params.transportId)) {
      throw new Error("Transport doesn't exist");
    }

    await this.transports.get(params.transportId).connect({
      dtlsParameters: params.dtlsParameters,
    });
  }

  async createProducer({
    transportId,
    kind,
    rtpParameters,
    appData,
  }: ProduceParams): Promise<PeerProducer> {
    if (!this.transports.has(transportId)) {
      throw new Error(`Transport ${transportId} doesn't exist`);
    }

    const producer = await this.transports.get(transportId).produce({
      kind,
      rtpParameters,
      appData,
    });

    producer.on('transportclose', () => {
      producer.close();
      this.producers.delete(producer.id);
    });

    this.producers.set(producer.id, producer);

    return {
      peerId: this.uuid,
      name: this.username,
      producers: [
        {
          id: producer.id,
          kind: appData.kind,
        },
      ],
    };
  }

  async createConsumer({
    transportId,
    producerId,
    rtpCapabilities,
    appData,
  }: ConsumeParams): Promise<Consumer> {
    if (!this.transports.has(transportId)) {
      throw new Error(`Transport ${transportId} doesn't exist`);
    }

    const consumer = await this.transports.get(transportId).consume({
      producerId,
      rtpCapabilities,
      paused: false,
      appData,
    });

    if (consumer.type === 'simulcast') {
      await consumer.setPreferredLayers({
        spatialLayer: 2,
        temporalLayer: 2,
      });
    }

    consumer.on('transportclose', () => {
      consumer.close();
      this.consumers.delete(consumer.id);
    });

    this.consumers.set(consumer.id, consumer);
    return consumer;
  }
}
