import type {
  Consumer,
  DtlsParameters,
  Producer,
  Transport,
} from 'mediasoup/node/lib/types';
import { v4 as uuidv4 } from 'uuid';

import { ConsumeParams, MediaStreamKind, ProduceParams } from './types';

export class MsPeer {
  public readonly uuid: string;
  private transports: Map<string, Transport>;
  private producers: Map<string, Producer>;
  private consumers: Map<string, Consumer>;

  constructor(public readonly id: string, public readonly name: string) {
    this.uuid = uuidv4();
    this.transports = new Map();
    this.producers = new Map();
    this.consumers = new Map();
  }

  addTransport(transport: Transport): void {
    if (this.transports.has(transport.id)) {
      console.log(
        `--- [AddTransport] transport ${transport.id} already assigned`
      );
      return;
    }

    console.log('--- [MsPeer]:addTransport transport', transport.id, 'added');

    this.transports.set(transport.id, transport);
  }

  async connectTransport(params: {
    transportId: string;
    dtlsParameters: DtlsParameters;
  }): Promise<void> {
    if (!this.transports.has(params.transportId)) {
      console.log(
        `--- [ConnectTransport] transport ${params.transportId} doesnt exist`
      );
      throw new Error("Transport doesn't exist");
    }

    await this.transports.get(params.transportId)!.connect({
      dtlsParameters: params.dtlsParameters,
    });
  }

  async createProducer({
    transportId,
    kind,
    rtpParameters,
    appData,
  }: ProduceParams): Promise<Producer> {
    if (!this.transports.has(transportId)) {
      console.log(`--- [CreateProducer] transport ${transportId} doesnt exist`);
      throw new Error(`Transport ${transportId} doesn't exist`);
    }

    const producer = await this.transports.get(transportId)!.produce({
      kind,
      rtpParameters,
      appData,
    });

    producer.on('transportclose', () => {
      console.log(`--- [Producer ${producer.id}] transport closed ---`);

      producer.close();
      this.producers.delete(producer.id);
    });

    this.producers.set(producer.id, producer);

    return producer;
  }

  async createConsumer({
    producerId,
    transportId,
    rtpCapabilities,
    appData,
  }: ConsumeParams): Promise<Consumer> {
    if (!this.transports.has(transportId)) {
      console.log(`--- [CreateConsumer] transport ${transportId} doesnt exist`);
      throw new Error("Transport doesn't exist");
    }

    try {
      const consumer = await this.transports.get(transportId)!.consume({
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
        console.log(`--- [Consumer ${consumer.id}] transport closed ---`);

        consumer.close();
        this.consumers.delete(consumer.id);
      });

      this.consumers.set(consumer.id, consumer);
      return consumer;
    } catch (error) {
      console.log('--- [CreateConsumer] consume failed ---', error);
      throw new Error('Consume failed');
    }
  }

  removeConsumer(consumerId: string): void {
    this.consumers.get(consumerId)?.close();
    this.consumers.delete(consumerId);
  }

  getProducers(): { id: string; kind: MediaStreamKind }[] {
    const producers: { id: string; kind: MediaStreamKind }[] = [];
    for (let producer of this.producers.values()) {
      producers.push({
        id: producer.id,
        kind: producer.appData.kind as MediaStreamKind,
      });
    }

    return producers;
  }

  pauseProducer(producerId: string): void {
    this.producers.get(producerId)?.pause();
  }

  resumeProducer(producerId: string): void {
    this.producers.get(producerId)?.resume();
  }

  closeProducer(kind: MediaStreamKind): string {
    let producerId: string | null = null;

    for (let prod of this.producers.values()) {
      if (prod.appData.kind === kind) {
        producerId = prod.id;
        break;
      }
    }

    if (producerId) {
      this.producers.get(producerId)!.close();
      this.producers.delete(producerId);

      console.log(`--- [CloseProducer] producer of kind: ${kind} closed ---`);

      return producerId;
    }

    console.log(`--- [CloseProducer] producer of kind: ${kind} not foud ---`);
    return '';
  }

  close(): void {
    this.transports.forEach((transport) => transport.close());
  }
}
