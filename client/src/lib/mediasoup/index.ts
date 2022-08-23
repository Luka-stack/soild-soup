import { Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import type {
  Consumer,
  MediaKind,
  Producer,
  RtpCapabilities,
  Transport,
} from 'mediasoup-client/lib/types';
import { socketPromise } from '../socket/socket-promise';

interface ConsumerProps {
  kind: MediaKind;
  stream: MediaStream;
  consumer: Consumer;
}

export class SignalingHandler {
  private _device: Device | null = null;
  private _producerTransport: Transport | null = null;
  private _consumerTransport: Transport | null = null;
  private _consumers: Map<string, Consumer> = new Map();
  private _producers: Map<string, Producer> = new Map();

  constructor(private readonly socket: Socket) {
    this.initListeners();
  }

  join(username: string, roomName: string): void {
    this.socket.emit('join', username, roomName);
  }

  async onJoin(rtpParams: RtpCapabilities): Promise<void> {
    await this.createDevice(rtpParams);
    await this.createProducerTransport();
    await this.createConsumerTransport();
  }

  onNewProducers(producers: string[]): void {
    producers.forEach((p) => this.consume(p));
  }

  async createDevice(routerRtpCapabilities: RtpCapabilities) {
    try {
      this._device = new Device();
      await this._device.load({ routerRtpCapabilities });
    } catch (error: any) {
      if (error.name === 'UnsupportedError') {
        console.error('Browser not supported');
      }
    }
  }

  async createProducerTransport(): Promise<void> {
    const params = await socketPromise(this.socket)('createWebRtcTransport');

    this._producerTransport = this._device!.createSendTransport(params);

    this._producerTransport!.on(
      'connect',
      ({ dtlsParameters }, callback, errback) => {
        // TODO
      }
    );

    this._producerTransport!.on(
      'produce',
      ({ kind, rtpParameters }, callback, errback) => {
        // TODO
      }
    );

    this._producerTransport!.on('connectionstatechange', (state: string) => {
      switch (state) {
        case 'connecting':
          console.log('--- [Producer Transport] Connecting ---');
          break;
        case 'connected':
          console.log('--- [Producer Transport] Connected ---');
          break;
        case 'failed':
          console.log('--- [Producer Transport] Failed ---');
          this._producerTransport?.close();
          break;
        default:
          break;
      }
    });
  }

  async createConsumerTransport(): Promise<void> {
    const params = await socketPromise(this.socket)('createWebRtcTransport');

    this._consumerTransport = this._device!.createRecvTransport(params);

    this._consumerTransport!.on(
      'connect',
      ({ dtlsParameters }, callback, errback) => {
        // TODO
      }
    );

    this._consumerTransport!.on('connectionstatechange', (state: string) => {
      switch (state) {
        case 'connecting':
          console.log('--- [Consumer Transport] Connecting ---');
          break;
        case 'connected':
          console.log('--- [Consumer Transport] Connected ---');
          break;
        case 'failed':
          console.log('--- [Consumer Transport] Failed ---');
          this._consumerTransport?.close();
          break;
        default:
          break;
      }
    });
  }

  async consume(producerId: string): Promise<void> {
    const { consumer, stream, kind } = await this.createConsumer(producerId);

    if (kind === 'audio') {
      // TODO update audios
    } else {
      // TODO update video
    }

    consumer.on('trackended', () => {
      // TODO remove consumer
      console.log(`--- [Consumer ${kind}] trackended`);
    });

    consumer.on('transportclose', () => {
      // TODO remove consumer
      console.log(`--- [Consumer ${kind}] transportclose`);
    });

    this._consumers.set(consumer.id, consumer);
  }

  async createConsumer(producerId: string): Promise<ConsumerProps> {
    const { id, kind, rtpParameters } = await socketPromise(this.socket)(
      'consume',
      {
        producerId,
        consumerTransportId: this._consumerTransport!.id,
        routerRtpCapabilities: this._device!.rtpCapabilities,
      }
    );

    const consumer = await this._consumerTransport!.consume({
      id,
      kind,
      producerId,
      rtpParameters,
    });

    const stream = new MediaStream();
    stream.addTrack(consumer!.track);

    return {
      kind,
      stream,
      consumer,
    };
  }

  async produce(kind: string, source: MediaStream): Promise<void> {
    if (this._producers.has(kind)) {
      console.log(`--- [Produce] Producer already exists for kind: ${kind}`);
      return;
    }

    const producer = await this.createProducer(kind, source);

    if (!producer) {
      // TODO
      return;
    }

    producer.on('transportclose', () => {
      // TODO remove producer
      console.log(`--- [Producer ${kind}] transportclose`);
    });

    producer.on('trackended', () => {
      // TODO remove producer
      console.log(`--- [Producer ${kind}] trackended`);
    });
  }

  async createProducer(
    kind: string,
    source: MediaStream
  ): Promise<Producer | undefined> {
    let track: MediaStreamTrack;
    let params: any;
    const appData = {
      kind,
    };

    switch (kind) {
      case 'audio':
        if (!this._device!.canProduce('audio')) {
          console.log('--- [Create Producer] cannot produce audio ---');
          return;
        }

        track = source.getAudioTracks()[0];
        params = {
          track,
          appData,
        };

        break;

      case 'video':
        if (!this._device!.canProduce('video')) {
          console.log('--- [Create Producer] cannot produce video ---');
          return;
        }

        track = source.getVideoTracks()[0];
        params = {
          track,
          appData,
          encodings: {},
          codecOptions: {},
        };

        break;

      default:
        console.log(`--- [CreateProducer] Unknown kind: ${kind}`);
        return;
    }

    const producer = await this._producerTransport!.produce(params);

    return producer;
  }

  initListeners() {
    this.socket.on('joined_room', (params: RtpCapabilities) => {
      this.onJoin(params);
    });

    this.socket.on('new_producers', (prducers: string[]) => {
      this.onNewProducers(prducers);
    });
  }
}