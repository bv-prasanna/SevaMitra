import {BadRequestException,ServiceUnavailableException} from '@nestjs/common';
import {PrivateDocumentStorage} from './private-document.storage';
import type {ConfigService} from '@nestjs/config';
describe('PrivateDocumentStorage',()=>{
 const settings={R2_ACCOUNT_ID:'a'.repeat(32),R2_PRIVATE_BUCKET:'sevamitra-private',R2_ACCESS_KEY_ID:'testing',R2_SECRET_ACCESS_KEY:'testing'};
 const make=(values:Record<string,string>=settings)=>new PrivateDocumentStorage({get:(k:string)=>values[k]} as unknown as ConfigService);
 const pdf={buffer:Buffer.from('%PDF-1.7 test'),size:13,mimetype:'application/pdf',originalname:'document.pdf'};
 afterEach(()=>jest.restoreAllMocks());
 it('rejects a forged PDF extension when bytes are not PDF',async()=>{await expect(make().upload('abc',{...pdf,buffer:Buffer.from('evil html header')})).rejects.toThrow(BadRequestException)});
 it('rejects oversized documents without contacting cloud',async()=>{await expect(make().upload('abc',{...pdf,size:6*1024*1024})).rejects.toThrow(BadRequestException)});
 it('rejects unsupported document types',async()=>{await expect(make().upload('abc',{...pdf,mimetype:'image/svg+xml'})).rejects.toThrow(BadRequestException)});
 it('fails closed without R2 credentials',async()=>{await expect(make({}).upload('abc',pdf)).rejects.toThrow(ServiceUnavailableException)});
 it('sends private R2 PUT with a signed request',async()=>{
  const http=jest.spyOn(global,'fetch').mockResolvedValue({ok:true} as Response);
  const path=await make().upload('application-1',pdf);
  expect(path).toMatch(/^r2:\/\/sevamitra-private\/onboarding\/application-1\/[0-9a-f-]+\.pdf$/);
  expect(http).toHaveBeenCalledWith(expect.stringContaining('.r2.cloudflarestorage.com/'),expect.objectContaining({
   method:'PUT',headers:expect.objectContaining({authorization:expect.stringContaining('AWS4-HMAC-SHA256')}),
  }));
 });
 it('does not accept a public URL as a private document key',async()=>{await expect(make().download('https://attacker.test/x.pdf')).rejects.toThrow('not in managed private storage')});
});
