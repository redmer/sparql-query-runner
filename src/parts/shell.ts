import commandExists from "command-exists";
import { exec } from "node:child_process";
import { IJobStepData } from "../config/types.js";
import { JobRuntimeContext, WorkflowPart, WorkflowPartGetter } from "../runner/types.js";

export class ShellPart implements WorkflowPart<"sources" | "steps"> {
  id = () => "steps/shell";
  names = ["steps/shell"];

  _commandName(command: string) {
    return command.trim().split(" ", 2)[0];
  }

  isQualifiedx(data: IJobStepData): boolean {
    const command = this._commandName(data.access);
    return commandExists.sync(command);
  }

  info(data: IJobStepData): (context: JobRuntimeContext) => Promise<WorkflowPartGetter> {
    return async (context: JobRuntimeContext) => {
      return {
        start: async () => {
          const command = this._commandName(data.access);

          if (!context.workflowContext.options.allowShellScripts) {
            context.warning(`shell scripts not allowed (${command})`);
            return;
          }

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
