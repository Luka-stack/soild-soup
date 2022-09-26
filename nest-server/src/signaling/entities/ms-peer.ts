import type {
  DtlsParameters,
  Producer,
  Transport,
} from 'mediasoup/node/lib/types';
import { v4 as uuidv4 } from 'uuid';

export class MsPeer {
  public readonly uuid: string;
  private transports: Map<string, Transport>;
  private producers: Map<string, Producer>;

  constructor(public readonly username: string) {
    this.uuid = uuidv4();
    this.transports = new Map();
    this.producers = new Map();
  }

  addTransport(transport: Transport): void {
    if (!this.transports.has(transport.id)) {
      console.log(
        `--- [AddTransport] transport ${transport.id} already assigned ---`,
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
  }: any): Promise<Producer> {
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

    return producer;
  }
}
