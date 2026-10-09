/** Pure presentation policy; protected actions are always checked server-side. */
export type WorkspaceRole='customer'|'provider'|'agent'|'admin';
export type WorkspaceAccess=Record<WorkspaceRole,boolean> & {
 canJoinProvider:boolean;canJoinAgent:boolean;
 providerStatus:string|null;agentStatus:string|null;
};
export function visibleWorkspaceRoles(access:WorkspaceAccess|null):WorkspaceRole[]{
 if(!access)return[];
 return (['customer','provider','agent','admin'] as WorkspaceRole[]).filter(role=>access[role]===true);
}
export function canOfferRoleEnrollment(access:WorkspaceAccess|null,role:'provider'|'agent'):boolean{
 if(!access)return false;
 return role==='provider'?access.canJoinProvider&&!access.provider:
  access.canJoinAgent&&!access.agent;
}
