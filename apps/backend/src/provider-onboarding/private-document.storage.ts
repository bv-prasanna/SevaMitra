import {BadRequestException,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {createHash,createHmac,randomUUID} from 'node:crypto';

export type UploadedDocument={buffer:Buffer,size:number,mimetype:string,originalname:string};
const ALLOWED_TYPES=new Set(['application/pdf','image/jpeg','image/png']);
const MAX_BYTES=5*1024*1024;
function hex(data:Buffer|string){return createHash('sha256').update(data).digest('hex')}
function hmac(key:Buffer|string,data:string){return createHmac('sha256',key).update(data).digest()}
function validBytes(file:UploadedDocument){
 if(file.mimetype==='application/pdf')return file.buffer.subarray(0,5).toString('ascii')==='%PDF-';
 if(file.mimetype==='image/jpeg')return file.buffer.subarray(0,3).toString('hex')==='ffd8ff';
 if(file.mimetype==='image/png')return file.buffer.subarray(0,8).toString('hex')==='89504e470d0a1a0a';
 return false;
}

/** Sends confidential evidence directly to a private Cloudflare R2 S3-compatible bucket. */
@Injectable()
export class PrivateDocumentStorage{
 constructor(private readonly config:ConfigService){}
 async upload(applicationId:string,file:UploadedDocument){
  if(!file?.buffer||file.size<=0||file.size>MAX_BYTES||!ALLOWED_TYPES.has(file.mimetype)||!validBytes(file)){
   throw new BadRequestException('Document must be a valid PDF/JPEG/PNG up to 5 MB');
  }
  const ext=file.mimetype==='application/pdf'?'pdf':file.mimetype==='image/png'?'png':'jpg';
  const key=`onboarding/${applicationId}/${randomUUID()}.${ext}`;
  const bucket=this.getSettings().bucket;
  const response=await this.signedFetch('PUT',key,file.buffer,file.mimetype);
  if(!response.ok)throw new ServiceUnavailableException('Private document storage rejected the upload');
  return `r2://${bucket}/${key}`;
 }
 async download(fileUrl:string):Promise<{content:Buffer,contentType:string}>{
  const bucket=this.getSettings().bucket;
  const prefix=`r2://${bucket}/onboarding/`;
  if(!fileUrl.startsWith(prefix))throw new NotFoundException('Document is not in managed private storage');
  const key=fileUrl.slice(`r2://${bucket}/`.length);
  if(!/^onboarding\/[0-9a-f-]+\/[0-9a-f-]+\.(pdf|png|jpg)$/.test(key))throw new NotFoundException('Invalid document reference');
  const response=await this.signedFetch('GET',key);
  if(!response.ok)throw new NotFoundException('Private document not found');
  const size=Number(response.headers.get('content-length')??'0');
  if(size>MAX_BYTES)throw new ServiceUnavailableException('Document size exceeds safety limit');
  const buffer=Buffer.from(await response.arrayBuffer());
  if(buffer.length>MAX_BYTES)throw new ServiceUnavailableException('Document size exceeds safety limit');
  return {content:buffer,contentType:response.headers.get('content-type')??'application/octet-stream'};
 }
 private getSettings(){
  const account=this.config.get<string>('R2_ACCOUNT_ID');
  const bucket=this.config.get<string>('R2_PRIVATE_BUCKET');
  const access=this.config.get<string>('R2_ACCESS_KEY_ID');
  const secret=this.config.get<string>('R2_SECRET_ACCESS_KEY');
  if(!account||!bucket||!access||!secret)throw new ServiceUnavailableException('Private storage is not configured');
  if(!/^[a-f0-9]{32}$/i.test(account)||!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket))throw new ServiceUnavailableException('Invalid private storage configuration');
  return {account,bucket,access,secret};
 }
 private async signedFetch(method:'PUT'|'GET',key:string,body?:Buffer,contentType?:string):Promise<Response>{
  const {account,bucket,access,secret}=this.getSettings();
  const host=`${account}.r2.cloudflarestorage.com`;
  const date=new Date().toISOString().replace(/[:-]|\.\d{3}/g,'');
  const day=date.slice(0,8);
  const path='/'+[bucket,...key.split('/')].map(encodeURIComponent).join('/');
  const payloadHash=hex(body??'');
  const headers:Record<string,string>={'host':host,'x-amz-content-sha256':payloadHash,'x-amz-date':date};
  if(contentType)headers['content-type']=contentType;
  const keys=Object.keys(headers).sort();
  const canonicalHeaders=keys.map(k=>k+':'+headers[k]!.trim()+'\n').join('');
  const signedHeaders=keys.join(';');
  const canonical=[method,path,'',canonicalHeaders,signedHeaders,payloadHash].join('\n');
  const scope=`${day}/auto/s3/aws4_request`;
  const stringToSign=['AWS4-HMAC-SHA256',date,scope,hex(canonical)].join('\n');
  const signingKey=hmac(hmac(hmac(hmac('AWS4'+secret,day),'auto'),'s3'),'aws4_request');
  const signature=createHmac('sha256',signingKey).update(stringToSign).digest('hex');
  headers.authorization=`AWS4-HMAC-SHA256 Credential=${access}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  try{
   return await fetch(`https://${host}${path}`,{
    method,headers,body:body?new Uint8Array(body):undefined,
    signal:AbortSignal.timeout(15000),
   });
  }catch{throw new ServiceUnavailableException('Private document storage is unavailable')}
 }
}
