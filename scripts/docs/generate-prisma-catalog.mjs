#!/usr/bin/env node
// Generated documentation from schema source, no DB connection or secrets needed.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const schema=readFileSync(resolve(root,'apps/backend/prisma/schema.prisma'),'utf8');
const migrationRoot=resolve(root,'apps/backend/prisma/migrations');
const migrations=readdirSync(migrationRoot,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
const generate=function generate(schema,migrations){
 const models=[...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map(m=>({name:m[1],body:m[2],schema:m[2].match(/@@schema\("([^"]+)"\)/)?.[1]??"public",table:m[2].match(/@@map\("([^"]+)"\)/)?.[1]??m[1]}));
 const enums=[...schema.matchAll(/^enum\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map(m=>({name:m[1],schema:m[2].match(/@@schema\("([^"]+)"\)/)?.[1]??"public",values:m[2].split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("//")&&!l.startsWith("@@")&&!l.startsWith("@")).map(l=>l.split(/\s+/)[0])}));
 const types=new Set(["String","Int","Float","Decimal","Boolean","DateTime","Json","Bytes","BigInt",...enums.map(e=>e.name)]);
 const one=(text)=>text.replaceAll("|","\\|").replaceAll("`","'");
 const row=(cells)=>"| "+cells.map(x=>one(String(x??"—"))).join(" | ")+" |";
 let out=[
 "# Database schema catalogue — generated from Prisma",
 "",
 "> Generated file. Edit `apps/backend/prisma/schema.prisma` and versioned migrations, then run `node scripts/docs/generate-prisma-catalog.mjs`. CI verifies that the generated Markdown is current. This is a **schema inventory**, not proof these migrations have been applied to a particular database.",
 "",
 `**Models:** ${models.length} | **Enums:** ${enums.length} | **Versioned migrations:** ${migrations.length} | **Namespaces:** ${[...new Set(models.map(m=>m.schema))].sort().join(", ")}.`,
 "",
 "## Physical table inventory",
 "",
 row(["PostgreSQL schema","Physical table","Prisma model","Scalar columns","Foreign-key relations"]),
 row(["---","---","---","---:","---:"])
 ];
 for(const m of models){
  const fields=m.body.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("//")&&!l.startsWith("@@"));
  const scalar=fields.filter(l=>types.has((l.match(/^(\w+)\s+([\w?[\]]+)/)||[])[2]?.replace(/[?[\]]/g,"")));
  const fk=fields.filter(l=>/\@relation\(\s*(?:\w+\s*,\s*)?fields\s*:\s*\[/.test(l)).length;
  out.push(row([m.schema,m.table,m.name,scalar.length,fk]));
 }
 out.push("","## Complete scalar column definitions","","Physical column names respect Prisma `@map`. Types are Prisma source types (not a vendor-neutral SQL DDL translation). Nullable types end with `?`, array types end with `[]`. Constraints and indexes listed in the model's Prisma definition are authoritative.","");
 for(const sch of [...new Set(models.map(m=>m.schema))].sort()){
  out.push(`### Namespace: \`${sch}\``,"");
  for(const m of models.filter(m=>m.schema===sch)){
   out.push(`#### \`${sch}.${m.table}\` — \`${m.name}\``,"",row(["Column","Prisma field","Type","Attributes"]),row(["---","---","---","---"]));
   const lines=m.body.split("\n").map(l=>l.trim()).filter(l=>l&&!l.startsWith("//"));
   for(const l of lines){
    const parts=l.match(/^(\w+)\s+([A-Za-z_]\w*(?:\[\])?\??)(?:\s+(.+))?$/);
    if(!parts||!types.has(parts[2].replace(/[?[\]]/g,"")))continue;
    const attr=parts[3]??"";
    const name=attr.match(/@map\("([^"]+)"\)/)?.[1]??parts[1];
    const flags=[];
    if(/@id(?:\s|$)/.test(attr))flags.push("PK");
    if(/@unique(?:\s|$)/.test(attr))flags.push("UNIQUE");
    if(/@default\(/.test(attr))flags.push(attr.match(/@default\(([^)]*)\)/)?.[0]??"default");
    if(/@updatedAt/.test(attr))flags.push("updatedAt");
    if(/@db\.[A-Za-z]+/.test(attr))flags.push(attr.match(/@db\.\w+(?:\([^)]*\))?/)?.[0]??"db type");
    out.push(row(["`"+name+"`","`"+parts[1]+"`","`"+parts[2]+"`",flags.join(", ")||"—"]));
   }
   const indexes=lines.filter(l=>l.startsWith("@@id(")||l.startsWith("@@unique(")||l.startsWith("@@index(")).map(l=>l.replace(/\s+/g," ").trim());
   if(indexes.length)out.push("", "**Composite keys/indexes:** "+indexes.map(x=>"`"+x+"`").join("; "));
   const relations=lines.map(l=>{const x=l.match(/^(\w+)\s+(\w+)\??\s+.*@relation\((?:[^)]*?)fields:\s*\[([^\]]+)\],\s*references:\s*\[([^\]]+)\]/);return x?`\`${x[3]}\` → \`${x[2]}.${x[4]}\``:null}).filter(Boolean);
   if(relations.length)out.push("","**Declared foreign-key fields:** "+relations.join("; "));
   out.push("");
  }
 }
 out.push("## Enumerations","","Enums are PostgreSQL schema-qualified in Prisma; use migration SQL for the actual database DDL.","",row(["Namespace","Enum","Allowed values"]),row(["---","---","---"]));
 for(const en of enums)out.push(row([en.schema,en.name,en.values.join(", ")]));
 out.push("","## Committed migration history","","These directories are already versioned in `apps/backend/prisma/migrations/`. Apply them **in order** through `prisma migrate deploy`, not by copying SQL fragments into a SQL editor.","");
 for(const m of migrations)out.push("- `"+m+"/migration.sql`");
 out.push("","## Important limits","","- This catalog does **not** include tables proposed by unmerged PR #37 (finance rules, billing/invoices).","- `prisma migrate status` compares migration history with the **target** database. A schema file alone cannot verify a remote deployment.","- Database-level triggers, check constraints and hand-written indexes may exist exclusively in migration SQL; examine those files before any change. In particular, payment gateway indexes and the append-only audit trigger are migrations.","- Do not regard generated names, enum types or FK declarations as authorization to patch production DDL manually.","");
 return out.join("\n").replace(/\n{3,}/g,"\n\n")+"\n";
};
const text=generate(schema,migrations);
const target=resolve(root,'docs/handbook/DATABASE_CATALOG.md');
if(process.argv.includes('--check')){
 const current=readFileSync(target,'utf8');
 if(current!==text){console.error('Database catalog out of sync. Run node scripts/docs/generate-prisma-catalog.mjs and commit the changes.');process.exit(1)}
 console.log('Database catalog up to date.');
}else{writeFileSync(target,text,'utf8');console.log('Wrote '+target)}
