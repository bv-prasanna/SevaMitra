import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleWorkspaceRoles,canOfferRoleEnrollment} from '../src/workspace-policy.ts';
const base={customer:true,provider:false,agent:false,admin:false,canJoinProvider:true,canJoinAgent:true,providerStatus:null,agentStatus:null};
test('FE/mobile: anonymous users have no privileged workspace menu',()=>{
 assert.deepEqual(visibleWorkspaceRoles(null),[]);
});
test('FE/mobile: customer has customer menu and enrollment CTAs only',()=>{
 assert.deepEqual(visibleWorkspaceRoles(base),['customer']);
 assert.equal(canOfferRoleEnrollment(base,'provider'),true);
 assert.equal(canOfferRoleEnrollment(base,'agent'),true);
});
test('FE/mobile: provider and agent screens appear only after profile registration',()=>{
 assert.deepEqual(visibleWorkspaceRoles({...base,provider:true,agent:true}),['customer','provider','agent']);
});
test('FE/mobile: admin menu is never shown without server entitlement',()=>{
 assert.equal(visibleWorkspaceRoles({...base,provider:true}).includes('admin'),false);
});
test('FE/mobile: multi-role user may switch across four roles',()=>{
 assert.deepEqual(visibleWorkspaceRoles({...base,provider:true,agent:true,admin:true}),['customer','provider','agent','admin']);
});
test('FE/mobile: do not show redundant enrollment after role is already held',()=>{
 assert.equal(canOfferRoleEnrollment({...base,provider:true},'provider'),false);
});
test('FE/mobile: unknown/null access cannot grant role enrollment',()=>{
 assert.equal(canOfferRoleEnrollment(null,'provider'),false);
});
