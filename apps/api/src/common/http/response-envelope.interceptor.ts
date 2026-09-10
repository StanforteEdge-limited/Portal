import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((value: any) => {
        if (value && typeof value === 'object' && typeof value.success === 'boolean') {
          return value;
        }

        if (
          value &&
          typeof value === 'object' &&
          Object.prototype.hasOwnProperty.call(value, 'data') &&
          Object.prototype.hasOwnProperty.call(value, 'meta')
        ) {
          return {
            success: true,
            data: value.data,
            meta: value.meta
          };
        }

        return {
          success: true,
          data: value
        };
      })
    );
  }
}
