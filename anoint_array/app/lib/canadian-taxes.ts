

export interface TaxCalculationItem {
  isDigital: boolean;
  priceCents: number;
  quantity: number;
  productProvinceOfSupply?: string; // For future use if needed
}

export interface CanadianTaxCalculationRequest {
  destinationProvince: string; // 'ON', 'BC', 'AB', etc.
  buyerCountry: string; // 'CA', 'US', etc.
  items: TaxCalculationItem[];
}

export interface TaxCalculationResult {
  gstCents: number;
  hstCents: number;
  pstCents: number;
  totalTaxCents: number;
  breakdownByItem: Array<{
    itemIndex: number;
    gstCents: number;
    hstCents: number;
    pstCents: number;
    totalTaxCents: number;
  }>;
}

// Canadian Provincial Tax Rates
const CANADIAN_TAX_RATES = {
  // HST Provinces (Harmonized Sales Tax)
  ON: { hst: 13.0 }, // Ontario
  NB: { hst: 15.0 }, // New Brunswick
  NL: { hst: 15.0 }, // Newfoundland and Labrador
  NS: { hst: 15.0 }, // Nova Scotia
  PE: { hst: 15.0 }, // Prince Edward Island

  // GST Only Provinces/Territories
  AB: { gst: 5.0 }, // Alberta
  NT: { gst: 5.0 }, // Northwest Territories
  NU: { gst: 5.0 }, // Nunavut
  YT: { gst: 5.0 }, // Yukon

  // GST + PST Provinces
  BC: { gst: 5.0, pst: 7.0 }, // British Columbia
  SK: { gst: 5.0, pst: 6.0 }, // Saskatchewan
  MB: { gst: 5.0, pst: 7.0 }, // Manitoba
  QC: { gst: 5.0, qst: 9.975 } // Quebec (QST treated as PST)
} as const;

type Province = keyof typeof CANADIAN_TAX_RATES;

/**
 * Calculate Canadian taxes based on destination province and item types
 */
export function calculateCanadianTaxes(
  request: CanadianTaxCalculationRequest
): TaxCalculationResult {
  const { destinationProvince, buyerCountry, items } = request;

  // No taxes for non-Canadian customers (exports)
  if (buyerCountry !== 'CA') {
    return {
      gstCents: 0,
      hstCents: 0,
      pstCents: 0,
      totalTaxCents: 0,
      breakdownByItem: items.map((_, index) => ({
        itemIndex: index,
        gstCents: 0,
        hstCents: 0,
        pstCents: 0,
        totalTaxCents: 0
      }))
    };
  }

  const province = destinationProvince.toUpperCase() as Province;
  const taxRates = CANADIAN_TAX_RATES[province];

  if (!taxRates) {
    throw new Error(`Unsupported province: ${destinationProvince}`);
  }

  let totalGstCents = 0;
  let totalHstCents = 0;
  let totalPstCents = 0;
  const breakdownByItem: TaxCalculationResult['breakdownByItem'] = [];

  items.forEach((item, index) => {
    const itemSubtotalCents = item.priceCents * item.quantity;
    let itemGstCents = 0;
    let itemHstCents = 0;
    let itemPstCents = 0;

    if (item.isDigital) {
      // Digital products: 5% GST nationwide, no PST/HST
      itemGstCents = Math.round(itemSubtotalCents * 0.05);
    } else {
      // Physical products: destination-based taxation
      if ('hst' in taxRates) {
        // HST provinces
        itemHstCents = Math.round(itemSubtotalCents * (taxRates.hst / 100));
      } else {
        // GST + PST provinces
        if (taxRates.gst) {
          itemGstCents = Math.round(itemSubtotalCents * (taxRates.gst / 100));
        }
        if ('pst' in taxRates && taxRates.pst) {
          itemPstCents = Math.round(itemSubtotalCents * (taxRates.pst / 100));
        }
        if ('qst' in taxRates && taxRates.qst) {
          // Quebec QST treated as PST
          itemPstCents = Math.round(itemSubtotalCents * (taxRates.qst / 100));
        }
      }
    }

    const itemTotalTaxCents = itemGstCents + itemHstCents + itemPstCents;

    totalGstCents += itemGstCents;
    totalHstCents += itemHstCents;
    totalPstCents += itemPstCents;

    breakdownByItem.push({
      itemIndex: index,
      gstCents: itemGstCents,
      hstCents: itemHstCents,
      pstCents: itemPstCents,
      totalTaxCents: itemTotalTaxCents
    });
  });

  return {
    gstCents: totalGstCents,
    hstCents: totalHstCents,
    pstCents: totalPstCents,
    totalTaxCents: totalGstCents + totalHstCents + totalPstCents,
    breakdownByItem
  };
}

/**
 * Format tax amount in CAD currency
 */
export function formatTaxAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Get province name from code
 */
export function getProvinceName(provinceCode: string): string {
  const names: Record<string, string> = {
    AB: 'Alberta',
    BC: 'British Columbia',
    MB: 'Manitoba',
    NB: 'New Brunswick',
    NL: 'Newfoundland and Labrador',
    NS: 'Nova Scotia',
    NT: 'Northwest Territories',
    NU: 'Nunavut',
    ON: 'Ontario',
    PE: 'Prince Edward Island',
    QC: 'Quebec',
    SK: 'Saskatchewan',
    YT: 'Yukon'
  };
  return names[provinceCode.toUpperCase()] || provinceCode;
}

/**
 * Get tax type display name for province
 */
export function getTaxTypeForProvince(provinceCode: string): string {
  const province = provinceCode.toUpperCase() as Province;
  const taxRates = CANADIAN_TAX_RATES[province];

  if (!taxRates) {
    return 'GST';
  }

  if ('hst' in taxRates) {
    return 'HST';
  } else if ('pst' in taxRates || 'qst' in taxRates) {
    return 'GST + PST';
  } else {
    return 'GST';
  }
}
