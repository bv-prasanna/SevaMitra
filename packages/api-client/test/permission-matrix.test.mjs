import test from 'node:test';
import assert from 'node:assert/strict';
import {matrixRows,togglePermission,validateRoleMatrixSelection} from '../src/permission-matrix.ts';
const keys=[
 {key:'iam.role.view',description:'View roles'},
 {key:'iam.role.add',description:'Add roles'},
 {key:'iam.role.edit',description:'Edit roles'},
 {key:'iam.role.delete',description:'Delete roles'},
 {key:'commission.rule.manage',description:'Bundled commission configuration'},
 {key:'provider.onboarding.review',description:'Review applicants'},
 {key:'bad-name',description:'Invalid'},
];
test('builds per-feature action matrix from actual backend keys',()=>{
 const rows=matrixRows(keys);
 const iam=rows.find(r=>r.feature==='iam.role');
 assert.deepEqual(iam?.cells.view.map(x=>x.key),['iam.role.view']);
 assert.deepEqual(iam?.cells.add.map(x=>x.key),['iam.role.add']);
 assert.deepEqual(iam?.cells.edit.map(x=>x.key),['iam.role.edit']);
 assert.deepEqual(iam?.cells.delete.map(x=>x.key),['iam.role.delete']);
});
test('never pretends bundled manage permissions are independent CRUD rights',()=>{
 const finance=matrixRows(keys).find(r=>r.feature==='commission.rule');
 assert.equal(finance.cells.manage.length,1);
 assert.equal(finance.cells.add.length,0);
 assert.equal(finance.cells.edit.length,0);
});
test('puts review actions in execute bucket',()=>{
 const onboarding=matrixRows(keys).find(r=>r.feature==='provider.onboarding');
 assert.equal(onboarding.cells.execute[0].key,'provider.onboarding.review');
});
test('ignores malformed/unknown permission names in rendering',()=>{
 assert.equal(matrixRows(keys).flatMap(x=>Object.values(x.cells).flat()).some(x=>x.key==='bad-name'),false);
});
test('toggling does not modify the original selection',()=>{
 const selected=['iam.role.view'];
 const updated=togglePermission(selected,'iam.role.add',true);
 assert.deepEqual(selected,['iam.role.view']);
 assert.deepEqual(updated,['iam.role.add','iam.role.view']);
 assert.deepEqual(togglePermission(updated,'iam.role.add',false),selected);
});
test('role submission rejects unknown permissions',()=>{
 assert.throws(()=>validateRoleMatrixSelection(['iam.role.nuclear'],keys),/Unknown permission/);
});
test('role submission deduplicates and sorts keys',()=>{
 assert.deepEqual(validateRoleMatrixSelection(['iam.role.view','iam.role.view','iam.role.add'],keys),['iam.role.add','iam.role.view']);
});
