import {allowedBrowserOrigins} from './cors-origins';
describe('Production CORS allowlist',()=>{
 it('restricts local development to explicitly known origins',()=>{
  expect(allowedBrowserOrigins(undefined,'development')).toContain('http://localhost:3000');
 });
 it('accepts exact HTTPS domains and deduplicates repeated entries',()=>{
  expect(allowedBrowserOrigins('https://app.example.com, https://app.example.com,https://admin.example.com','production'))
  .toEqual(['https://app.example.com','https://admin.example.com']);
 });
 it.each(['','*','http://example.com','https://*.example.com','https://example.com/path',
   'https://example.com/','javascript:alert(1)','https://username:pass@example.com'])(
   'rejects unsafe production CORS value %s',value=>{
    expect(()=>allowedBrowserOrigins(value,'production')).toThrow();
   }
 );
 it('requires a configured origin for staging',()=>{
  expect(()=>allowedBrowserOrigins(undefined,'staging')).toThrow();
 });
 it('honors explicit development origins',()=>{
  expect(allowedBrowserOrigins('http://localhost:4173','development')).toEqual(['http://localhost:4173']);
 });
});
