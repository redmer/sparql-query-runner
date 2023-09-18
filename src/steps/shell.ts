import commandExists from "command-exists";
import { exec } from "node:child_process";
import { IJobStepData } from "../config/types.js";
import { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types.js";
import { sleep } from "../utils/sleep.js";

export class ShellPart implements WorkflowPart<IJobStepData> {
  id = () => "steps/shell";

  _commandName(command: string) {
    return command.trim().split(" ", 2)[0];
  }

  isQualified(data: IJobStepData): boolean {
    const command = this._commandName(data.access);
    return commandExists.sync(command);
  }

  info(data: IJobStepData): (context: JobRuntimeContext) => Promise<WorkflowGetter> {
    return async (context: JobRuntimeContext) => {
      return {
        start: async () => {
          const command = this._commandName(data.access);

          if (!context.workflowContext.options.allowShellScripts) {
            context.warning(`shell scripts not allowed (${command})`);
            return;
          }

          const securityDelay = 1;
          context.info(`will execute command (${command}) in ${securityDelay} s...`);
          await sleep(securityDelay * 1000); // TODO: We already have the --exec-shell command

          return new Promise((resolve, reject) => {
            exec(data.access, (error, stdout, stderr) => {
              if (error) reject(stderr);
              resolve(undefined);
            });
          });
        },
      };
    };
  }
}
