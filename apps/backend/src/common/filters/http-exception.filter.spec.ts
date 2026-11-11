import { ArgumentsHost, BadRequestException, ForbiddenException, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter negative-path responses', () => {
 const filter = new HttpExceptionFilter();
 function invoke(error: unknown) {
  const json=jest.fn();
  const status=jest.fn().mockReturnValue({json});
  const host={switchToHttp:()=>({getResponse:()=>({status})})} as unknown as ArgumentsHost;
  filter.catch(error,host);
  return {status:status.mock.calls[0][0],body:json.mock.calls[0][0]};
 }
 it('redacts unexpected database and stack information',()=>{
  const actual=invoke(new Error('Prisma database password=top-secret'));
  expect(actual.status).toBe(500);
  expect(actual.body.error.message).toBe('An unexpected server error occurred. Please try again later.');
  expect(JSON.stringify(actual.body)).not.toContain('top-secret');
 });
 it('redacts explicitly thrown 5xx exceptions with sensitive nested messages',()=>{
  for(const exception of [
   new InternalServerErrorException('DB password=top-secret'),
   new ServiceUnavailableException('Payments gateway API key=top-secret'),
  ]){
   const actual=invoke(exception);
   expect(actual.status).toBeGreaterThanOrEqual(500);
   expect(actual.body.error.message).toMatch(/try again later/);
   expect(JSON.stringify(actual.body)).not.toContain('top-secret');
  }
 });
 it('keeps a safe validation message for user-correctable requests',()=>{
  const actual=invoke(new BadRequestException('Date must not be in the past'));
  expect(actual.status).toBe(400);
  expect(actual.body.error.message).toBe('Date must not be in the past');
 });
 it('reports forbidden access without exposing internal details',()=>{
  const actual=invoke(new ForbiddenException('Forbidden'));
  expect(actual.status).toBe(403);
  expect(actual.body.error.message).toBe('Forbidden');
 });
});
