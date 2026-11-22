/** Runtime-safe finance enum values shared by DTOs, quote logic and tests.
 * Prisma's generated enum constants are intentionally not used at runtime:
 * the database remains the source of truth and these string unions match schema.prisma.
 */
export const FinanceGeoScope={ALL:'ALL',STATE:'STATE',DISTRICT:'DISTRICT',TALUK:'TALUK',TOWN:'TOWN'} as const;
export type FinanceGeoScope=typeof FinanceGeoScope[keyof typeof FinanceGeoScope];
export const FinanceTargetScope={ALL:'ALL',CATEGORY:'CATEGORY',SERVICE:'SERVICE',VARIANT:'VARIANT',OFFERING:'OFFERING'} as const;
export type FinanceTargetScope=typeof FinanceTargetScope[keyof typeof FinanceTargetScope];
export const FinanceTaxComponent={CGST:'CGST',SGST:'SGST',IGST:'IGST',CESS:'CESS'} as const;
export type FinanceTaxComponent=typeof FinanceTaxComponent[keyof typeof FinanceTaxComponent];
export const FinancePriceAdjustment={PERCENT_UP:'PERCENT_UP',PERCENT_DOWN:'PERCENT_DOWN',AMOUNT_UP:'AMOUNT_UP',AMOUNT_DOWN:'AMOUNT_DOWN'} as const;
export type FinancePriceAdjustment=typeof FinancePriceAdjustment[keyof typeof FinancePriceAdjustment];
export const BillingInvoiceStatus={PRO_FORMA:'PRO_FORMA',ISSUED:'ISSUED',VOID:'VOID'} as const;
export type BillingInvoiceStatus=typeof BillingInvoiceStatus[keyof typeof BillingInvoiceStatus];
