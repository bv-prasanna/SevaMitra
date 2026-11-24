export type PermissionAction = 'view'|'add'|'edit'|'delete'|'manage'|'execute'|'other';
export type MatrixPermission={key:string;description:string};
export type MatrixRow={feature:string;cells:Record<PermissionAction,MatrixPermission[]>};

export const MATRIX_ACTIONS: readonly PermissionAction[] =
 ['view','add','edit','delete','manage','execute','other'] as const;
/**
 * Matrix rows expose only actual backend permission keys. Never invent
 * "Add" / "Edit" permissions when the backend only enforces "manage".
 */
export function matrixRows(permissions:readonly MatrixPermission[]):MatrixRow[]{
 const rows=new Map<string,MatrixRow>();
 for(const perm of permissions){
  if(!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/.test(perm.key))continue;
  const parts=perm.key.split('.');
  const actionSuffix=parts.pop()!;
  const feature=parts.join('.');
  const action:PermissionAction=
    actionSuffix==='view'||actionSuffix==='add'||actionSuffix==='edit'||
    actionSuffix==='delete'||actionSuffix==='manage'?actionSuffix:
    actionSuffix==='create'?'add':actionSuffix==='remove'?'delete':
    actionSuffix==='send'||actionSuffix==='review'?'execute':'other';
  const row=rows.get(feature)||{
   feature,cells:{view:[],add:[],edit:[],delete:[],manage:[],execute:[],other:[]},
  };
  row.cells[action].push(perm);
  rows.set(feature,row);
 }
 return [...rows.values()].sort((a,b)=>a.feature.localeCompare(b.feature));
}
export function togglePermission(selection:readonly string[],key:string,checked:boolean):string[]{
 const set=new Set(selection);
 if(checked)set.add(key);else set.delete(key);
 return [...set].sort();
}
export function validateRoleMatrixSelection(keys:readonly string[],allowed:readonly MatrixPermission[]):string[]{
 const known=new Set(allowed.map(x=>x.key));
 const unexpected=keys.filter(x=>!known.has(x));
 if(unexpected.length)throw new Error('Unknown permission keys: '+unexpected.join(', '));
 return [...new Set(keys)].sort();
}
