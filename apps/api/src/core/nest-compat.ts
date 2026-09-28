export * from './errors';
export * from './logger';

export function Injectable(): ClassDecorator {
  return () => undefined;
}

export function Global(): ClassDecorator {
  return () => undefined;
}

export function Inject(_token?: unknown): ParameterDecorator & PropertyDecorator {
  return () => undefined;
}

export function Optional(): ParameterDecorator & PropertyDecorator {
  return () => undefined;
}

export interface ExecutionContext {
  switchToHttp(): {
    getRequest<T = unknown>(): T;
    getResponse<T = unknown>(): T;
  };
}

export function createParamDecorator<TData = unknown, TResult = unknown>(
  factory: (data: TData, context: ExecutionContext) => TResult,
): (data?: TData) => ParameterDecorator {
  return (data?: TData) => {
    void factory;
    void data;
    return () => undefined;
  };
}

export interface OnModuleInit {
  onModuleInit(): unknown;
}

export interface OnModuleDestroy {
  onModuleDestroy(): unknown;
}
