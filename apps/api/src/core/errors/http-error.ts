export class HttpError extends Error {
  constructor(
    message: string,
    readonly statusCode = 500,
    readonly code?: string,
  ) {
    super(message);
  }
}

export class BadRequestException extends HttpError {
  constructor(message = 'Bad Request', code?: string) {
    super(message, 400, code);
  }
}

export class UnauthorizedException extends HttpError {
  constructor(message: unknown = 'Unauthorized', code?: string) {
    super(typeof message === 'string' ? message : JSON.stringify(message), 401, code);
  }
}

export class ForbiddenException extends HttpError {
  constructor(message = 'Forbidden', code?: string) {
    super(message, 403, code);
  }
}

export class NotFoundException extends HttpError {
  constructor(message = 'Not Found', code?: string) {
    super(message, 404, code);
  }
}

export class ConflictException extends HttpError {
  constructor(message = 'Conflict', code?: string) {
    super(message, 409, code);
  }
}

export class BadGatewayException extends HttpError {
  constructor(message = 'Bad Gateway', code?: string) {
    super(message, 502, code);
  }
}
