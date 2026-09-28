export class Logger {
  constructor(private readonly context?: string) {}

  log(message: unknown, ...optionalParams: unknown[]) {
    console.log(this.format(message), ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    console.warn(this.format(message), ...optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    console.error(this.format(message), ...optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    console.debug(this.format(message), ...optionalParams);
  }

  private format(message: unknown) {
    return this.context ? `[${this.context}] ${String(message)}` : message;
  }
}
