import { of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { AuditInterceptor } from './audit.interceptor';
import type { AuditService } from './audit.service';

function makeContext(overrides: {
  method: string;
  user?: { id: string };
  params?: Record<string, string>;
  routePath?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
}): ExecutionContext {
  const req = {
    method: overrides.method,
    user: overrides.user,
    params: overrides.params ?? {},
    route: overrides.routePath ? { path: overrides.routePath } : undefined,
    path: overrides.path ?? '/fallback',
    ip: overrides.ip ?? '127.0.0.1',
  };
  const res = { statusCode: overrides.statusCode ?? 200 };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
}

function makeHandler(body: unknown = { ok: true }): CallHandler {
  return { handle: () => of(body) };
}

describe('AuditInterceptor', () => {
  let auditService: { record: jest.Mock };
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditInterceptor(auditService as unknown as AuditService);
  });

  it('records a mutating, authenticated request after it succeeds', (done) => {
    const context = makeContext({
      method: 'POST',
      user: { id: 'user-1' },
      routePath: '/bookings/me/:id/cancel',
      params: { id: 'booking-1' },
      statusCode: 201,
    });

    interceptor
      .intercept(context, makeHandler({ id: 'booking-1', status: 'CANCELLED' }))
      .subscribe(() => {
        setImmediate(() => {
          expect(auditService.record).toHaveBeenCalledWith({
            actorUserId: 'user-1',
            httpMethod: 'POST',
            routePath: '/bookings/me/:id/cancel',
            entityId: 'booking-1',
            statusCode: 201,
            ipAddress: '127.0.0.1',
          });
          done();
        });
      });
  });

  it('falls back to the response body id when there is no route param id', (done) => {
    const context = makeContext({
      method: 'POST',
      user: { id: 'user-1' },
      routePath: '/bookings/me',
      statusCode: 201,
    });

    interceptor
      .intercept(context, makeHandler({ id: 'booking-new' }))
      .subscribe(() => {
        setImmediate(() => {
          expect(auditService.record).toHaveBeenCalledWith(
            expect.objectContaining({ entityId: 'booking-new' }),
          );
          done();
        });
      });
  });

  it('does not record a GET request', (done) => {
    const context = makeContext({ method: 'GET', user: { id: 'user-1' } });

    interceptor.intercept(context, makeHandler()).subscribe(() => {
      setImmediate(() => {
        expect(auditService.record).not.toHaveBeenCalled();
        done();
      });
    });
  });

  it('does not record an unauthenticated request', (done) => {
    const context = makeContext({ method: 'POST' });

    interceptor.intercept(context, makeHandler()).subscribe(() => {
      setImmediate(() => {
        expect(auditService.record).not.toHaveBeenCalled();
        done();
      });
    });
  });
});
