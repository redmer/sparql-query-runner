import commandExists from "command-exists";
import { exec } from "node:child_process";
import { IJobStepData } from "../config/types";
import { JobRuntimeContext, WorkflowGetter, WorkflowPart } from "../runner/types";

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
        // additionalQueryContext: async () => {},
        // data: async () => {},
        // done: async () => {},
        start: async () => {
          const command = this._commandName(data.access);

          if (!context.context.options.allowShellScripts) {
            context.warning(`shell scripts not allowed (${command})`);
            return;
          }

          return new Promise((resolve, reject) => {
            exec(data.access, (error, stdout, stderr) => {
              if (error) reject(stderr);
              context.info(`executing command (${command})...`);
              resolve();
            });
          });
        },
      };
    };
  }
}
