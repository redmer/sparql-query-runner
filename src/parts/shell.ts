import { exec } from "node:child_process";
import { IJobStepData } from "../config/types.js";
import { JobRuntimeContext, WorkflowPartStep } from "../runner/types.js";

export class ShellCommandStep implements WorkflowPartStep {
  id = () => "shell-step";
  names = ["steps/shell"];

  _commandName(command: string) {
    return command.trim().split(" ", 2)[0];
  }

  exec(data: IJobStepData) {
    return async (context: JobRuntimeContext) => {
      return {
        init: async () => {
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
        },
      };
    };
  }
}
