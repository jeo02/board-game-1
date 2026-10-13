// Worker thread entry for the chess computer, so its search runs off the
// main thread that ticks every room. See bot.js for the search itself.

import { parentPort } from "node:worker_threads";
import { chooseMove } from "./bot.js";

parentPort.on("message", ({ id, request }) => {
  try {
    parentPort.postMessage({ id, move: chooseMove(request) });
  } catch (error) {
    parentPort.postMessage({ id, error: error.message });
  }
});
