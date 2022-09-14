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
import {
  isSharing,
  participants,
  setAmIMuted,
  setAmIStreaming,
  setAuthRoom,
  setParticipants,
  setScreen,
  updateParticipants,
} from '../../state';
import { batch } from 'solid-js';

interface ConsumerProps {
  kind: MediaKind;
  stream: MediaStream;
  consumer: Consumer;
}

interface ParticipantsProducers {
  peerId: string;
  name: string;
  producers: {
    id: string;
    kind: 'video' | 'audio' | 'screen';
  }[];
}

interface ClosedStatus {
  peerId: string;
  consumerId: string;
  kind: MediaKind;
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

  changeMutation(): void {
    const producer = this._producers.get('audio');

    if (!producer) {
      return;
    }

    const producerPaused = !producer.paused;
    setAmIMuted(producerPaused);

    if (producer.paused) {
      producer.resume();
    } else {
      producer.pause();
    }

    this.socket.emit('producer_paused', producer.id, producerPaused);
  }

  async toggleStreaming(): Promise<void> {
    const producer = this._producers.get('video');

    if (producer) {
      producer.close();
      this.socket.emit('producer_closed', 'video');
      setAmIStreaming(false);
      return;
    }

    // Start streaming / start video producer
    const video = await this.getMediaStream('video');
    this.produce('video', video);
    setAmIStreaming(true);
  }

  resumeProducer(producerType: string): void {
    if (!this._producers.has(producerType)) {
      return;
    }

    this._producers.get(producerType)!.resume();
  }

  disconnect(): void {
    batch(() => {
      setParticipants([]);
      setAmIMuted(false);
      setAuthRoom(null);
    });

    this.socket.emit('exit_room');

    this._consumerTransport?.close();
    this._producerTransport?.close();
    this.cleanListeners();
  }

  async shareScreen(): Promise<void> {
    // check if i'm producing

    // check if someone else is producing

    const stream = await this.getMediaStream('screen');
    this.produce('screen', stream);
  }

  private async onJoin(rtpParams: RtpCapabilities): Promise<void> {
    await this.createDevice(rtpParams);
    await this.createProducerTransport();
    await this.createConsumerTransport();

    this.socket.emit('get_producers');
  }

  private onNewProducers(producers: ParticipantsProducers[]): void {
    console.log(
      '--- [Signaling Handler] recived new producers',
      producers,
      '---'
    );

    producers.forEach((p) => this.consume(p));
  }

  private async createDevice(routerRtpCapabilities: RtpCapabilities) {
    try {
      this._device = new Device();
      await this._device.load({ routerRtpCapabilities });

      this._device.observer.on('newtransport', (transport) => {
        transport.observer.on('newconsumer', (consumer: any) => {
          consumer.observer.on('pause', () => {
            console.log('consumer closed');
          });
        });
      });

      console.log('--- [Create Device] device created ---');
    } catch (error: any) {
      if (error.name === 'UnsupportedError') {
        console.error('Browser not supported');
      }
    }
  }

  private async createProducerTransport(): Promise<void> {
    const params = await socketPromise(this.socket)('create_webrtc_transport');

    this._producerTransport = this._device!.createSendTransport(params);

    this._producerTransport!.on(
      'connect',
      ({ dtlsParameters }, callback, errback) => {
        socketPromise(this.socket)('connect_transport', {
          dtlsParameters,
          transportId: params.id,
        }).then((error) => {
          if (error) {
            console.log('--- [Connect Transport]: error ', error);
            errback(error);
          }

          console.log('--- [Producer Transport] Connected ---');
          callback();
        });
      }
    );

    this._producerTransport!.on(
      'produce',
      ({ kind, rtpParameters, appData }, callback, errback) => {
        console.log(`--- [Producer Transport]: produce ${kind} ---`);

        socketPromise(this.socket)('produce', {
          kind,
          appData,
          rtpParameters,
          transportId: this._producerTransport!.id,
        }).then((producerId) => {
          console.log(`--- [Producer Transport]: callback ${producerId} ---`);
          callback({ id: producerId });
        });
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

    console.log(
      '--- [Signaling Handler]:createProducerTransport transport',
      this._producerTransport.id,
      'created ---'
    );

    const stream = await this.getMediaStream('audio');
    this.produce('audio', stream);
  }

  private async createConsumerTransport(): Promise<void> {
    const params = await socketPromise(this.socket)('create_webrtc_transport');

    this._consumerTransport = this._device!.createRecvTransport(params);

    this._consumerTransport!.on(
      'connect',
      ({ dtlsParameters }, callback, errback) => {
        socketPromise(this.socket)('connect_transport', {
          dtlsParameters,
          transportId: params.id,
        }).then((error) => {
          if (error) {
            errback(error);
          }

          callback();
        });
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

    console.log(
      '--- [Signaling Handler]:createConsumerTransport transport created ---'
    );
  }

  private async consume(
    paritipantsProds: ParticipantsProducers
  ): Promise<void> {
    const participant: any = {
      uuid: paritipantsProds.peerId,
      name: paritipantsProds.name,
    };

    for (let producer of paritipantsProds.producers) {
      // TODO delete kind, dont need it
      const { consumer, stream, kind } = await this.createConsumer(
        producer.id,
        paritipantsProds.peerId
      );

      if (producer.kind === 'audio') {
        participant.audio = stream;
      } else if (producer.kind === 'video') {
        participant.video = stream;
      } else {
        console.log('---- setting  screen ---', stream);
        participant.screen = stream;
      }

      consumer.on('trackended', () => {
        // TODO remove consumer
        console.log(`--- [Consumer ${kind}] trackended`);
      });

      consumer.on('transportclose', () => {
        // TODO remove consumer
        console.log(`--- [Consumer ${kind}] transportclose`);
      });

      consumer.observer.on('close', () => {
        console.log('--- consumer observer closed ---');
      });

      this._consumers.set(consumer.id, consumer);
    }

    updateParticipants(participant);
  }

  private async createConsumer(
    producerId: string,
    participantId: string
  ): Promise<ConsumerProps> {
    const { consumerId, kind, rtpParameters } = await socketPromise(
      this.socket
    )('consume', {
      producerId,
      consumerTransportId: this._consumerTransport!.id,
      rtpCapabilities: this._device!.rtpCapabilities,
      appData: {
        peerId: participantId,
      },
    });

    const consumer = await this._consumerTransport!.consume({
      id: consumerId,
      kind,
      producerId,
      rtpParameters,
    });

    const stream = new MediaStream([consumer.track]);

    return {
      kind,
      stream,
      consumer,
    };
  }

  private async produce(kind: string, source: MediaStream): Promise<void> {
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

    this._producers.set(kind, producer);
  }

  private async createProducer(
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
        console.log('--- [Create Producer] creating audio ---');

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
        };

        break;

      case 'screen':
        track = source.getVideoTracks()[0];
        params = {
          track,
          appData,
        };

        break;

      default:
        console.log(`--- [CreateProducer] Unknown kind: ${kind} ---`);
        break;
    }

    const producer = await this._producerTransport!.produce(params);

    return producer;
  }

  private onParticipantMutation(status: {
    peerId: string;
    paused: boolean;
  }): void {
    setParticipants(
      (participant) => participant.uuid === status.peerId,
      'muted',
      () => status.paused
    );
  }

  private onParticipantLeft(peerId: string): void {
    setParticipants(participants.filter((p) => p.uuid !== peerId));
  }

  private onProducerClosed({ peerId, kind, consumerId }: ClosedStatus): void {
    this._consumers.get(consumerId)?.close();
    this._consumers.delete(consumerId);

    setParticipants(
      (participant) => participant.uuid === peerId,
      kind,
      () => undefined
    );
  }

  private cleanListeners(): void {
    this.socket.off('joined_room');
    this.socket.off('new_producers');
    this.socket.off('producer_closed');
    this.socket.off('participant_mutation');
  }

  private initListeners() {
    this.socket.on('joined_room', (params: RtpCapabilities) => {
      console.log('--- [Event: joined_room] ---', params);

      this.onJoin(params);
    });

    this.socket.on(
      'new_producers',
      (participantsProds: ParticipantsProducers[]) => {
        this.onNewProducers(participantsProds);
      }
    );

    this.socket.on('participant_mutation', (status) => {
      this.onParticipantMutation(status);
    });

    this.socket.on('participant_left', (peerId) => {
      this.onParticipantLeft(peerId);
    });

    this.socket.on('producer_closed', (status) => {
      this.onProducerClosed(status);
    });
  }

  private async getMediaStream(kind: 'video' | 'audio' | 'screen') {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new Error('--- [GetMediaStream] Media Device is not available ---');
    }

    if (kind === 'screen') {
      console.log('Getting Screen Media');

      return await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: {
          width: { max: 1920 },
          height: { max: 1080 },
          frameRate: { max: 30 },
        },
      });
    }

    const constraints = {
      audio: kind === 'audio',
      video: kind === 'video',
    };

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error: any) {
      console.log(error);
      throw new Error('--- [GetMediaStream Error] ---');
    }
  }
}
