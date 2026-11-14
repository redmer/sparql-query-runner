/**
 * Thrown by workflow parts to gracefully stop the execution of the current
 * job (skipping any remaining steps and targets) without marking the job
 * as failed and without stopping the rest of the workflow.
 *
 * The {@link JobSupervisor} catches this error, logs the message, and
 * returns normally.
 */
export class StopJob extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StopJob";
  }
}
