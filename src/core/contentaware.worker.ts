// Runs the content-aware algorithms off the UI thread. Cancel = Worker.terminate().
import { runCaJob, type CaJob } from './contentaware';

self.onmessage = (e: MessageEvent<CaJob>) => {
  try {
    const result = runCaJob(e.data, (f) => self.postMessage({ progress: f }));
    self.postMessage({ result }, { transfer: result ? [result.buffer] : [] });
  } catch (err: any) {
    self.postMessage({ error: String(err?.message ?? err) });
  }
};
