import test from "node:test";
import assert from "node:assert/strict";
import {extractOtpLoginTokens} from "../src/index.ts";
const valid={kind:"tokens",tokens:{accessToken:"jwt",refreshToken:"secret",expiresIn:900},user:{id:"u-1"}};
test("parses actual OTP login contract",()=>{
 assert.deepEqual(extractOtpLoginTokens(valid),{accessToken:"jwt",refreshToken:"secret",expiresIn:900});
});
test("does not treat a password-reset response as a login",()=>{
 assert.throws(()=>extractOtpLoginTokens({kind:"resetToken",resetToken:"reset"}),/token pair/);
});
test("rejects missing nested tokens",()=>{
 assert.throws(()=>extractOtpLoginTokens({accessToken:"jwt"}),/token pair/);
});
test("rejects malformed or empty secrets",()=>{
 for(const tokens of [
  {accessToken:"",refreshToken:"secret",expiresIn:900},
  {accessToken:"jwt",refreshToken:"",expiresIn:900},
  {accessToken:"jwt",refreshToken:"secret",expiresIn:0},
  {accessToken:"jwt",refreshToken:"secret",expiresIn:Number.NaN},
 ]){
  assert.throws(()=>extractOtpLoginTokens({kind:"tokens",tokens}),/token pair/);
 }
});
test("does not accept null",()=>{
 assert.throws(()=>extractOtpLoginTokens(null),/Invalid login response/);
});
