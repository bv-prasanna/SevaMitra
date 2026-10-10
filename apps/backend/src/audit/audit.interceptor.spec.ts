import { of, throwError } from 'rxjs';
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
  headers?: Record<string,string>;
}): ExecutionContext {
  const req = {
    method: overrides.method,
    user: overrides.user,
    params: overrides.params ?? {},
    route: overrides.routePath ? { path: overrides.routePath } : undefined,
    path: overrides.path ?? '/fallback',
    ip: overrides.ip ?? '127.0.0.1',
    headers: overrides.headers ?? {},
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
            latitude:null,longitude:null,accuracyMeters:null,locationCapturedAt:null,
            locationStatus:'NOT_PROVIDED',outcome:'SUCCESS',
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
  it('logs failed authenticated action attempts without swallowing the error',(done)=>{
    const context=makeContext({method:'POST',user:{id:'actor-1'},path:'/bookings/me'});
    const apiError={getStatus:()=>409,message:'Conflict'};
    interceptor.intercept(context,{handle:()=>throwError(()=>apiError)}).subscribe({
     error:()=>setImmediate(()=>{
      expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({
       actorUserId:'actor-1',statusCode:409,outcome:'FAILED',
      }));
      done();
     }),
    });
  });
  it('keeps valid geo evidence and accuracy on a booking event',(done)=>{
    const headers={
     'x-event-latitude':'12.97','x-event-longitude':'77.59',
     'x-event-accuracy-meters':'20','x-event-captured-at':new Date().toISOString(),
    };
    const context=makeContext({method:'POST',user:{id:'actor-1'},headers});
    interceptor.intercept(context,makeHandler({id:'booking-1'})).subscribe(()=>{
     setImmediate(()=>{
      expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({
       latitude:12.97,longitude:77.59,accuracyMeters:20,locationStatus:'CLIENT_REPORTED',
      }));
      done();
     });
    });
  });
  it('marks invalid location without accepting coordinate data',(done)=>{
    const headers={
     'x-event-latitude':'200','x-event-longitude':'77.59',
     'x-event-accuracy-meters':'20','x-event-captured-at':new Date().toISOString(),
    };
    const context=makeContext({method:'POST',user:{id:'actor-1'},headers});
    interceptor.intercept(context,makeHandler()).subscribe(()=>{
     setImmediate(()=>{
      expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({
       latitude:null,longitude:null,locationStatus:'INVALID',
      }));
      done();
     });
    });
  });

});
