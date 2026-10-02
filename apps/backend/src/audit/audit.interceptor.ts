import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Bound globally (see audit.module.ts) rather than requiring each
 * controller to opt in — see docs/modules/AUDIT_IMPLEMENTATION.md §1 for
 * why a blanket interceptor was chosen over a per-endpoint decorator.
 * Only records a request that is both mutating and authenticated
 * (unauthenticated writes — OTP request/verify, login — aren't "who
 * changed what" in the sense this module cares about) and only after it
 * succeeds, so failed attempts leave no entry.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const actorUserId = (req as { user?: { id: string } }).user?.id;
    if (!actorUserId || !MUTATING_METHODS.has(req.method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((body) => {
        const entityId =
          (req.params as Record<string, string> | undefined)?.id ??
          (body && typeof body === 'object'
            ? (body as { id?: string }).id
            : undefined) ??
          null;

        const route = (req as { route?: { path?: string } }).route;

        this.auditService
          .record({
            actorUserId,
            httpMethod: req.method,
            routePath: route?.path ?? req.path,
            entityId,
            statusCode: res.statusCode,
            ipAddress: req.ip ?? null,
          })
          .catch((err: unknown) => {
            this.logger.error(
              'Failed to write audit log entry',
              err instanceof Error ? err.stack : err,
            );
          });
      }),
    );
  }
}
