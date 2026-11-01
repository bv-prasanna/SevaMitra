/** Minimal deterministic, one-page ASCII PDF for internal invoice downloads.
 * No remote renderer, templates, or paid dependency; issued tax invoices still
 * require verified supplier details and statutory review upstream.
 */
function printable(s:unknown):string{
 return String(s??'').normalize('NFKD').replace(/[^\x20-\x7e]/g,'?').replace(/[()\\]/g,' ').slice(0,120);
}
export type InvoicePrintData={
 invoiceNumber:string|null;status:string;service:string;bookingId:string;issuedAt:string|null;
 supplierName:string;supplierAddress:string;supplierGstin:string|null;supplierStateCode:string|null;
 sacCode:string|null;authorizedSignatory:string|null;customerName:string;customerAddress:string;
 placeOfSupply:string;currency:string;originalAmount:string;serviceAmount:string;visitFee:string;
 taxableAmount:string;taxTotal:string;total:string;taxes:{component:string;rateBps:number;amount:string}[];
};
export function invoicePdf(x:InvoicePrintData):Buffer{
 const rows:string[]=[
  x.status==='ISSUED'?'TAX INVOICE':'PRO FORMA - NOT A TAX INVOICE',
  'SevaMitra | One App. Many Services.',
  'Document: '+(x.invoiceNumber??'DRAFT / NO TAX INVOICE NUMBER'),
  'Date: '+(x.issuedAt??'Not issued'),
  'Booking reference: '+x.bookingId,
  'Supplier: '+x.supplierName,
  'Supplier address: '+x.supplierAddress,
  'Supplier GSTIN: '+(x.supplierGstin??'Not configured'),
  'Supplier state code: '+(x.supplierStateCode??'Not configured'),
  'Recipient: '+x.customerName,
  'Recipient address: '+x.customerAddress,
  'Place of supply: '+x.placeOfSupply,
  'Service / SAC: '+x.service+' / '+(x.sacCode??'Not configured'),
  'Original service amount: '+x.currency+' '+x.originalAmount,
  'Adjusted service amount: '+x.currency+' '+x.serviceAmount,
  'Visit fee: '+x.currency+' '+x.visitFee,
  'Taxable value: '+x.currency+' '+x.taxableAmount,
  ...x.taxes.map(t=>t.component+' ('+(t.rateBps/100).toFixed(2)+'%): '+x.currency+' '+t.amount),
  'Total tax: '+x.currency+' '+x.taxTotal,
  'TOTAL: '+x.currency+' '+x.total,
  'Authorized signatory: '+(x.authorizedSignatory??''),
  'Signature: ________________________________',
  x.status==='ISSUED'?'Issuer is responsible for statutory reporting and document validation.':
   'For estimation only. Not a receipt, GST invoice, or proof of payment.',
 ];
 const esc=(s:string)=>printable(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
 const stream=['BT','/F1 12 Tf',...rows.flatMap((line,i)=>['1 0 0 1 40 '+(780-i*26)+' Tm','('+esc(line)+') Tj']),'ET'].join('\n')+'\n';
 const bytes=Buffer.from(stream,'ascii');
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Length '+bytes.length+' >>\nstream\n'+stream+'endstream',
 ];
 let out='%PDF-1.4\n';const offsets=[0];
 for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(out,'ascii'));out+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const start=Buffer.byteLength(out,'ascii');out+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 for(let i=1;i<offsets.length;i++)out+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
 out+='trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF';
 return Buffer.from(out,'ascii');
}
