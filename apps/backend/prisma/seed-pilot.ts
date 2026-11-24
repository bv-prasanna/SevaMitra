/** Idempotent pilot catalogue/geography data. Never run against production. */
import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
async function main(){
 if(process.env.ALLOW_PILOT_SEED!=='YES'||process.env.NODE_ENV==='production')throw new Error('Pilot seeding requires ALLOW_PILOT_SEED=YES and non-production NODE_ENV');
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL missing');
 const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
 try{
  const state=await prisma.state.upsert({where:{name:'Karnataka'},update:{isActive:true},create:{name:'Karnataka',code:'KA'}});
  const geo=[
   {district:'Haveri',taluk:'Haveri',town:'Haveri',pin:'581110'},
   {district:'Vijayanagara',taluk:'Hosapete',town:'Hosapete',pin:'583201'},
   {district:'Bengaluru Urban',taluk:'Bengaluru North',town:'Vijayanagar Bengaluru',pin:'560040'},
   {district:'Bengaluru Urban',taluk:'Bengaluru North',town:'Byraveshwaranagar',pin:'560072'},
   {district:'Bengaluru Urban',taluk:'Bengaluru East',town:'Bellandur',pin:'560103'},
  ];
  for(const row of geo){
   const district=await prisma.district.upsert({where:{stateId_name:{stateId:state.id,name:row.district}},update:{isActive:true},create:{stateId:state.id,name:row.district}});
   const taluk=await prisma.taluk.upsert({where:{districtId_name:{districtId:district.id,name:row.taluk}},update:{isActive:true},create:{districtId:district.id,name:row.taluk}});
   await prisma.townVillage.upsert({where:{talukId_name:{talukId:taluk.id,name:row.town}},update:{pincode:row.pin,isActive:true},create:{talukId:taluk.id,name:row.town,pincode:row.pin}});
  }
  const categories=[
   {name:'Electrical',services:['Fan repair','Switch and socket repair','House wiring inspection']},
   {name:'Plumbing',services:['Tap repair','Leak detection','Water tank service']},
   {name:'Home Cleaning',services:['Kitchen cleaning','Bathroom cleaning','Home deep cleaning']},
   {name:'Appliance Repair',services:['Washing machine service','Refrigerator service','Mixer repair']},
   {name:'Agricultural Services',services:['Borewell motor inspection','Irrigation pipe repair']},
  ];
  for(const item of categories){
   const category=await prisma.serviceCategory.upsert({where:{name:item.name},update:{isActive:true},create:{name:item.name}});
   for(const name of item.services){
    const found=await prisma.service.findFirst({where:{categoryId:category.id,name}});
    if(!found)await prisma.service.create({data:{categoryId:category.id,name,description:'Pilot service catalogue entry — scope and pricing to be finalized',tags:[],isActive:true}});
   }
  }
  console.log('Pilot seed complete: 3 districts, 5 locations, 5 categories and 14 services. No users or verified providers fabricated.');
 }finally{await prisma.$disconnect()}
}
main().catch(e=>{console.error(e);process.exit(1)});
