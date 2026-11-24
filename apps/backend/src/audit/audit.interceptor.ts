import {CallHandler,ExecutionContext,Injectable,Logger,NestInterceptor} from '@nestjs/common';
import type {Request,Response} from 'express';
import {Observable,tap,catchError,throwError} from 'rxjs';
import {AuditService} from './audit.service';
import {parseEventLocation} from './event-location';

const MUTATING_METHODS=new Set(['POST','PUT','PATCH','DELETE']);

/** Logs authenticated business writes on success AND handler failure, without
 * storing request payloads or secrets. Location is best-effort and untrusted.
 * Authentication failures from guards precede interceptors, so they require
 * a separate security-event stream in future.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor{
 private readonly logger=new Logger(AuditInterceptor.name);
 constructor(private readonly auditService:AuditService){}
 intercept(context:ExecutionContext,next:CallHandler):Observable<unknown>{
  const req=context.switchToHttp().getRequest<Request>();
  const res=context.switchToHttp().getResponse<Response>();
  const userId=(req as {user?:{id:string}}).user?.id;
  if(!userId||!MUTATING_METHODS.has(req.method))return next.handle();
  const route=(req as {route?:{path?:string}}).route?.path??req.path;
  const location=parseEventLocation(req.headers as Record<string,string|string[]|undefined>);
  const write=(outcome:'SUCCESS'|'FAILED',statusCode:number,response?:unknown)=>{
   const entityId=(req.params as Record<string,string>|undefined)?.id??
    (response&&typeof response==='object'?(response as {id?:string}).id:undefined)??null;
   void this.auditService.record({
    actorUserId:userId,httpMethod:req.method,routePath:route,entityId,
    statusCode,ipAddress:req.ip??null,...location,outcome,
   }).catch((error:unknown)=>this.logger.error('Audit write failed',error instanceof Error?error.stack:error));
  };
  return next.handle().pipe(
   tap((body)=>write('SUCCESS',res.statusCode,body)),
   catchError((error:unknown)=>{
    const status=(error as {getStatus?:()=>number}).getStatus?.()??500;
    write('FAILED',status);
    return throwError(()=>error);
   }),
  );
 }
}
