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
  participants,
  setAmIMuted,
  setAmIStreaming,
  setAuthRoom,
  setParticipants,
  updateParticipants,
  setScreenStream,
  ScreenStream,
  setAmIScreening,
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
  kind: 'audio' | 'video' | 'screen';
}

export class SignalingHandler {
  private device: Device | null = null;
  private producerTransport: Transport | null = null;
  private consumerTransport: Transport | null = null;
  private consumers: Map<string, Consumer> = new Map();
  private producers: Map<string, Producer> = new Map();

  constructor(private readonly socket: Socket) {
    this.initListeners();
  }

  async join(
    username: string,
    roomName: string,
    createRoom: boolean
  ): Promise<string | null> {
    try {
      const params = await socketPromise(this.socket)('join', {
        username,
        roomName,
        createRoom,
      });

      this.onJoin(params);
      return null;
    } catch (error: any) {
      return error.message[0];
    }
  }

  hasProducer(kind: string): boolean {
    return this.producers.has(kind);
  }

  changeMutation(): void {
    const producer = this.producers.get('audio');

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

    this.socket.emit('producer_paused', {
      id: producer.id,
      paused: producerPaused,
    });
  }

  async toggleStreaming(): Promise<void> {
    if (this.producers.has('video')) {
      this.producers.get('video')!.close();
      this.producers.delete('video');

      this.socket.emit('producer_closed', { kind: 'video' });
      setAmIStreaming(false);
      return;
    }

    const video = await this.getMediaStream('video');
    this.produce('video', video);
    setAmIStreaming(true);
  }

  resumeProducer(producerType: string): void {
    if (!this.producers.has(producerType)) {
      return;
    }

    this.producers.get(producerType)!.resume();
  }

  disconnect(): void {
    batch(() => {
      setParticipants([]);
      setAmIMuted(false);
      setAuthRoom(null);
    });

    this.socket.emit('exit_room');

    this.consumerTransport?.close();
    this.producerTransport?.close();
    this.cleanListeners();
  }

  async shareScreen(): Promise<void> {
    if (this.producers.has('screen')) {
      this.producers.get('screen')!.close();
      this.producers.delete('screen');

      this.socket.emit('producer_closed', { kind: 'screen' });
      setAmIScreening(false);
      return;
    }

    const stream = await this.getMediaStream('screen');
    this.produce('screen', stream);
    setAmIScreening(true);
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
      this.device = new Device();
      await this.device.load({ routerRtpCapabilities });
      console.log('--- [Create Device] device created ---');
    } catch (error: any) {
      if (error.name === 'UnsupportedError') {
        console.error('Browser not supported');
      }
    }
  }

  private async createProducerTransport(): Promise<void> {
    const params = await socketPromise(this.socket)('create_webrtc_transport');

    this.producerTransport = this.device!.createSendTransport(params);

    this.producerTransport!.on(
      'connect',
      ({ dtlsParameters }, callback, errback) => {
        socketPromise(this.socket)('connect_transport', {
          dtlsParameters,
          transportId: params.id,
        })
          .then(() => {
            callback();
          })
          .catch((error) => {
            console.log(
              '--- [Producer Transport]: connect error ',
              error,
              '---'
            );
            errback(error);
          });
      }
    );

    this.producerTransport!.on(
      'produce',
      ({ kind, rtpParameters, appData }, callback, errback) => {
        console.log(`--- [Producer Transport]: produce ${kind} ---`);

        socketPromise(this.socket)('produce', {
          kind,
          appData,
          rtpParameters,
          transportId: this.producerTransport!.id,
        })
          .then((producerId) => {
            callback({ id: producerId });
          })
          .catch((error) => {
            console.log(
              '--- [Producer Transport]: produce error',
              error,
              '---'
            );
            errback(error);
          });
      }
    );

    this.producerTransport!.on('connectionstatechange', (state: string) => {
      switch (state) {
        case 'connecting':
          console.log('--- [Producer Transport] Connecting ---');
          break;
        case 'connected':
          console.log('--- [Producer Transport] Connected ---');
          break;
        case 'failed':
          console.log('--- [Producer Transport] Failed ---');
          this.producerTransport?.close();
          break;
        default:
          break;
      }
    });

    console.log(
      '--- [Producer Transport]:createProducerTransport transport',
      this.producerTransport.id,
      'created ---'
    );

    const stream = await this.getMediaStream('audio');
    this.produce('audio', stream);
  }

  private async createConsumerTransport(): Promise<void> {
    const params = await socketPromise(this.socket)('create_webrtc_transport');

    this.consumerTransport = this.device!.createRecvTransport(params);

    this.consumerTransport!.on(
      'connect',
      ({ dtlsParameters }, callback, errback) => {
        socketPromise(this.socket)('connect_transport', {
          dtlsParameters,
          transportId: params.id,
        })
          .then(() => {
            callback();
          })
          .catch((error) => {
            console.log('--- [Consumer Transport]:connect error', error, '---');
            errback(error);
          });
      }
    );

    this.consumerTransport!.on('connectionstatechange', (state: string) => {
      switch (state) {
        case 'connecting':
          console.log('--- [Consumer Transport] Connecting ---');
          break;
        case 'connected':
          console.log('--- [Consumer Transport] Connected ---');
          break;
        case 'failed':
          console.log('--- [Consumer Transport] Failed ---');
          this.consumerTransport?.close();
          break;
        default:
          break;
      }
    });

    console.log(
      '--- [Consumer Transport]:createConsumerTransport transport',
      this.consumerTransport.id,
      'created ---'
    );
  }

  private async consume(
    paritipantsProds: ParticipantsProducers
  ): Promise<void> {
    let screenStream: ScreenStream | null = null;
    const participant: any = {
      uuid: paritipantsProds.peerId,
      name: paritipantsProds.name,
    };

    for (const producer of paritipantsProds.producers) {
      const { consumer, stream } = await this.createConsumer(
        producer.id,
        paritipantsProds.peerId,
        producer.kind
      );

      if (producer.kind === 'audio') {
        participant.audio = stream;
      } else if (producer.kind === 'video') {
        participant.video = stream;
      } else {
        screenStream = {
          uuid: paritipantsProds.peerId,
          name: paritipantsProds.name,
          stream: stream,
        };
      }

      this.consumers.set(consumer.id, consumer);
    }

    if (participant.video || participant.audio) {
      updateParticipants(participant);
    }

    if (screenStream) {
      setScreenStream(screenStream);
    }
  }

  private async createConsumer(
    producerId: string,
    participantId: string,
    mediaKind: string
  ): Promise<ConsumerProps> {
    const { consumerId, kind, rtpParameters } = await socketPromise(
      this.socket
    )('consume', {
      producerId,
      transportId: this.consumerTransport!.id,
      rtpCapabilities: this.device!.rtpCapabilities,
      appData: {
        peerId: participantId,
        kind: mediaKind,
      },
    });

    const consumer = await this.consumerTransport!.consume({
      id: consumerId,
      kind,
      producerId,
      rtpParameters,
    });

    const stream = new MediaStream([consumer.track]);

    console.log('Consumer Stream', stream);

    return {
      kind,
      stream,
      consumer,
    };
  }

  private async produce(kind: string, source: MediaStream): Promise<void> {
    if (this.producers.has(kind)) {
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

    this.producers.set(kind, producer);
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

        if (!this.device!.canProduce('audio')) {
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
        if (!this.device!.canProduce('video')) {
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

    const producer = await this.producerTransport!.produce(params);

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
    this.consumers.get(consumerId)?.close();
    this.consumers.delete(consumerId);

    if (kind === 'screen') {
      setScreenStream(null);
    } else {
      setParticipants(
        (participant) => participant.uuid === peerId,
        kind,
        () => undefined
      );
    }
  }

  private cleanListeners(): void {
    this.socket.off('joined_room');
    this.socket.off('new_producers');
    this.socket.off('producer_closed');
    this.socket.off('participant_mutation');
  }

  private initListeners() {
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
