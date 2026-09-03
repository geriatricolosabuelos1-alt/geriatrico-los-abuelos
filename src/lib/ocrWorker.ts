import { createWorker, PSM, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

export function obtenerLectorTickets(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("spa").then(async (worker) => {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      return worker;
    });
  }
  return workerPromise;
}
