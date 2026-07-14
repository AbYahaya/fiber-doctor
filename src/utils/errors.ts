export class FiberDoctorError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "FiberDoctorError";
  }
}

export class FiberConfigError extends FiberDoctorError {
  public constructor(message: string) {
    super(message);
    this.name = "FiberConfigError";
  }
}

export class FiberNetworkError extends FiberDoctorError {
  public constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FiberNetworkError";
  }
}

export class FiberResponseParseError extends FiberDoctorError {
  public constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FiberResponseParseError";
  }
}

export class FiberRpcError extends FiberDoctorError {
  public constructor(
    message: string,
    public readonly code: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "FiberRpcError";
  }
}
