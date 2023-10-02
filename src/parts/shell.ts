import commandExists from "command-exists";
import { exec } from "node:child_process";
import { PassThrough } from "stream";
import { IJobStepData } from "../config/types.js";
import { JobRuntimeContext, WorkflowPartStep } from "../runner/types.js";

export class ShellPart implements WorkflowPartStep {
  id = () => "steps/shell";
  names = ["steps/shell"];

  _commandName(command: string) {
    return command.trim().split(" ", 2)[0];
  }

  isQualified(data: IJobStepData): boolean {
    const command = this._commandName(data.access);
    return commandExists.sync(command);
  }

  exec(data: IJobStepData) {
    return async (context: JobRuntimeContext) => {
      return {
        asStep: async () => {
          const commandName = this._commandName(data.access);

          if (!context.workflowContext.options.allowShellScripts) {
            context.warning(`shell scripts not allowed (${commandName})`);
            return;
          }

          await new Promise((resolve, reject) => {
            exec(data.access, (error, stdout, stderr) => {
              if (error) reject(stderr);
              resolve(undefined);
            });
          });
          return new PassThrough({ objectMode: true });
        },
      };
    };
  }
}
