import { StepGetter, Step } from ".";
import { IStep } from "../config/types";
import { PipelineSupervisor } from "../runner";
import { SQRInfo } from "../utils/errors";

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Delay execution for x seconds. */
export default class Delay implements Step {
  identifier = () => "delay";

  async info(config: IStep): Promise<StepGetter> {
    const delayTimeSec = (config["duration"] as number) ?? 5;

    return async (app: PipelineSupervisor) => {
      return {
        matchesSource: async () => {
          return config.type === "delay";
        },
        start: async () => {
          SQRInfo(`\t\tProcessing delay... (${delayTimeSec} s)`);
          await delay(delayTimeSec * 1000);
        },
      };
    };
  }
}
