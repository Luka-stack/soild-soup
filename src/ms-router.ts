import * as mediasoup from 'mediasoup';
import type { Worker } from 'mediasoup/node/lib/types';
import { config } from './mediasoup-config';

const workers: Worker[] = [];

let nextMediasoupWorkerId = 0;

export const createRouter = async () => {
  let worker = workers[nextMediasoupWorkerId];

  if (!worker) {
    const { logLevel, logTags, rtcMaxPort, rtcMinPort } =
      config.mediasoup.worker;

    worker = await mediasoup.createWorker({
      logLevel,
      logTags,
      rtcMaxPort,
      rtcMinPort,
    });

    worker.on('died', () => {
      console.log(
        `--- mediasoup worker died, exiting in 2 seconds ... [pid:${worker.pid}]`
      );

      setTimeout(() => {
        process.exit(1);
      }, 2000);
    });

    workers.push(worker);
  }

  nextMediasoupWorkerId =
    (nextMediasoupWorkerId + 1) % config.mediasoup.numWorkers;

  const mediaCodecs = config.mediasoup.router.mediaCodecs;
  const mediasoupRouter = await worker.createRouter({ mediaCodecs });

  return mediasoupRouter;
};
