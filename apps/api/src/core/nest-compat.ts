export * from './errors';
export * from './logger';

export function Injectable(): ClassDecorator {
  return () => undefined;
}

export function Inject(_token?: unknown): ParameterDecorator & PropertyDecorator {
  return () => undefined;
}

export function Optional(): ParameterDecorator & PropertyDecorator {
  return () => undefined;
}

export interface OnModuleInit {
  onModuleInit(): unknown;
}

export interface OnModuleDestroy {
  onModuleDestroy(): unknown;
}
