import type {
  Consumer,
  DtlsParameters,
  MediaKind,
  Producer,
  Transport,
} from 'mediasoup/node/lib/types';
import { v4 as uuidv4 } from 'uuid';

import { ConsumeParams, ProduceParams } from './types';

export class MsPeer {
  public readonly uuid: string;
  private _transports: Map<string, Transport>;
  private _producers: Map<string, Producer>;
  private _consumers: Map<string, Consumer>;

  constructor(public readonly id: string, public readonly name: string) {
    this.uuid = uuidv4();
    this._transports = new Map();
    this._producers = new Map();
    this._consumers = new Map();
  }

  addTransport(transport: Transport): void {
    if (this._transports.has(transport.id)) {
      console.log(
        `--- [AddTransport] transport ${transport.id} already assigned`
      );
      return;
    }

    console.log('--- [MsPeer]:addTransport transport', transport.id, 'added');

    this._transports.set(transport.id, transport);
  }

  async connectTransport(params: {
    transportId: string;
    dtlsParameters: DtlsParameters;
  }): Promise<void> {
    if (!this._transports.has(params.transportId)) {
      console.log(
        `--- [ConnectTransport] transport ${params.transportId} doesnt exist`
      );
      throw new Error("Transport doesn't exist");
    }

    await this._transports.get(params.transportId)!.connect({
      dtlsParameters: params.dtlsParameters,
    });
  }

  async createProducer({
    transportId,
    kind,
    rtpParameters,
  }: ProduceParams): Promise<Producer> {
    if (!this._transports.has(transportId)) {
      console.log(`--- [CreateProducer] transport ${transportId} doesnt exist`);
      throw new Error(`Transport ${transportId} doesn't exist`);
    }

    const producer = await this._transports.get(transportId)!.produce({
      kind,
      rtpParameters,
    });

    producer.on('transportclose', () => {
      console.log(`--- [Producer ${producer.id}] transport closed ---`);

      producer.close();
      this._producers.delete(producer.id);
    });

    this._producers.set(producer.id, producer);

    console.log('=================== [] Created Producer', kind);

    return producer;
  }

  async createConsumer({
    producerId,
    consumerTransportId,
    rtpCapabilities,
    appData,
  }: ConsumeParams): Promise<Consumer> {
    if (!this._transports.has(consumerTransportId)) {
      console.log(
        `--- [CreateConsumer] transport ${consumerTransportId} doesnt exist`
      );
      throw new Error("Transport doesn't exist");
    }

    try {
      const consumer = await this._transports
        .get(consumerTransportId)!
        .consume({
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
        this._consumers.delete(consumer.id);
      });

      this._consumers.set(consumer.id, consumer);
      return consumer;
    } catch (error) {
      console.log('--- [CreateConsumer] consume failed ---', error);
      throw new Error('Consume failed');
    }
  }

  removeConsumer(consumerId: string): void {
    this._consumers.get(consumerId)?.close();
    this._consumers.delete(consumerId);
  }

  getProducers(): string[] {
    const producers: string[] = [];
    for (let producer of this._producers.values()) {
      producers.push(producer.id);
    }

    return producers;
  }

  pauseProducer(producerId: string): void {
    this._producers.get(producerId)?.pause();
  }

  resumeProducer(producerId: string): void {
    this._producers.get(producerId)?.resume();
  }

  closeProducer(kind: MediaKind): void {
    let producerId: string | null = null;

    for (let prod of this._producers.values()) {
      if (prod.kind === kind) {
        producerId = prod.id;
        break;
      }
    }

    if (producerId) {
      this._producers.get(producerId)!.close();
      this._producers.delete(producerId);
      return;
    }

    console.log(`--- [CloseProducer] producer of kind: ${kind} not foud ---`);
  }

  close(): void {
    this._transports.forEach((transport) => transport.close());
  }
}
