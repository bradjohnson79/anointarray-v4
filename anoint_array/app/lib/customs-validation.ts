

export interface CustomsItem {
  hsCode?: string;
  countryOfOrigin?: string;
  customsDescription?: string;
  unitValueCad?: number;
  massGramsEach?: number;
  quantity: number;
  name: string;
  isDigital: boolean;
}

export interface CustomsValidationError {
  field: string;
  itemIndex: number;
  itemName: string;
  message: string;
}

export interface CustomsValidationResult {
  isValid: boolean;
  errors: CustomsValidationError[];
  isDdpRequired: boolean;
}

/**
 * Validate customs data for international shipments
 */
export function validateCustomsData(
  items: CustomsItem[],
  destinationCountry: string,
  originCountry: string = 'CA'
): CustomsValidationResult {
  const isDdpRequired = originCountry === 'CA' && destinationCountry === 'US';
  const errors: CustomsValidationError[] = [];

  // Only validate customs data if DDP is required
  if (!isDdpRequired) {
    return {
      isValid: true,
      errors: [],
      isDdpRequired: false
    };
  }

  items.forEach((item, index) => {
    // Skip digital items for customs validation
    if (item.isDigital) {
      return;
    }

    // Validate required customs fields for physical items going to US
    if (!item.hsCode || item.hsCode.trim() === '') {
      errors.push({
        field: 'hsCode',
        itemIndex: index,
        itemName: item.name,
        message: `Missing HS code for item "${item.name}" - please set HS code in Product → Customs & Compliance`
      });
    }

    if (!item.countryOfOrigin || item.countryOfOrigin.trim() === '') {
      errors.push({
        field: 'countryOfOrigin',
        itemIndex: index,
        itemName: item.name,
        message: `Missing country of origin for item "${item.name}" - please set country of origin in Product → Customs & Compliance`
      });
    }

    if (!item.customsDescription || item.customsDescription.trim() === '') {
      errors.push({
        field: 'customsDescription',
        itemIndex: index,
        itemName: item.name,
        message: `Missing customs description for item "${item.name}" - please set customs description in Product → Customs & Compliance`
      });
    }

    if (!item.unitValueCad || item.unitValueCad <= 0) {
      errors.push({
        field: 'unitValueCad',
        itemIndex: index,
        itemName: item.name,
        message: `Missing or invalid unit value for item "${item.name}" - please set default customs value in Product → Customs & Compliance`
      });
    }

    if (!item.massGramsEach || item.massGramsEach <= 0) {
      errors.push({
        field: 'massGramsEach',
        itemIndex: index,
        itemName: item.name,
        message: `Missing or invalid weight for item "${item.name}" - please set mass in grams in Product → Customs & Compliance`
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    isDdpRequired
  };
}

/**
 * Generate customs content details for Canada Post API
 */
export function generateCustomsContentDetails(items: CustomsItem[]): Array<{
  description: string;
  quantity: number;
  'unit-weight': number; // in kg
  'unit-value': number; // in CAD
  'hs-tariff-code': string;
  'country-of-origin': string;
}> {
  return items
    .filter(item => !item.isDigital) // Only physical items need customs declarations
    .map(item => ({
      description: item.customsDescription || item.name,
      quantity: item.quantity,
      'unit-weight': ((item.massGramsEach || 0) / 1000), // Convert grams to kg
      'unit-value': item.unitValueCad || 0,
      'hs-tariff-code': item.hsCode || '',
      'country-of-origin': item.countryOfOrigin || 'CA'
    }));
}

/**
 * Calculate total customs value for shipment
 */
export function calculateTotalCustomsValue(items: CustomsItem[]): number {
  return items
    .filter(item => !item.isDigital)
    .reduce((total, item) => {
      return total + ((item.unitValueCad || 0) * item.quantity);
    }, 0);
}

/**
 * Calculate total weight for shipment
 */
export function calculateTotalWeight(items: CustomsItem[]): { grams: number; kg: number } {
  const totalGrams = items.reduce((total, item) => {
    return total + ((item.massGramsEach || 0) * item.quantity);
  }, 0);

  return {
    grams: totalGrams,
    kg: totalGrams / 1000
  };
}
