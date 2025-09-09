

import { validateCustomsData, generateCustomsContentDetails, CustomsItem } from '../customs-validation';

describe('Customs Validation', () => {
  const completePhysicalItem: CustomsItem = {
    hsCode: '7117.11.0000',
    countryOfOrigin: 'CA',
    customsDescription: 'Sterling silver healing pendant',
    unitValueCad: 49.99,
    massGramsEach: 25,
    quantity: 1,
    name: 'Healing Pendant',
    isDigital: false
  };

  const incompletePhysicalItem: CustomsItem = {
    hsCode: '',
    countryOfOrigin: '',
    customsDescription: '',
    unitValueCad: 0,
    massGramsEach: 0,
    quantity: 1,
    name: 'Incomplete Item',
    isDigital: false
  };

  const digitalItem: CustomsItem = {
    quantity: 1,
    name: 'Digital Frequency Pack',
    isDigital: true
  };

  describe('DDP requirement determination', () => {
    test('Canada to US shipment requires DDP', () => {
      const result = validateCustomsData([completePhysicalItem], 'US', 'CA');
      expect(result.isDdpRequired).toBe(true);
    });

    test('Canada to Europe does not require DDP', () => {
      const result = validateCustomsData([completePhysicalItem], 'DE', 'CA');
      expect(result.isDdpRequired).toBe(false);
    });

    test('Domestic Canada shipment does not require DDP', () => {
      const result = validateCustomsData([completePhysicalItem], 'CA', 'CA');
      expect(result.isDdpRequired).toBe(false);
    });
  });

  describe('Customs validation for US shipments', () => {
    test('Complete physical item passes validation', () => {
      const result = validateCustomsData([completePhysicalItem], 'US', 'CA');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.isDdpRequired).toBe(true);
    });

    test('Incomplete physical item fails validation', () => {
      const result = validateCustomsData([incompletePhysicalItem], 'US', 'CA');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.isDdpRequired).toBe(true);
      
      // Should have errors for missing HS code, origin, description, value, and weight
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'hsCode',
            itemName: 'Incomplete Item'
          }),
          expect.objectContaining({
            field: 'countryOfOrigin',
            itemName: 'Incomplete Item'
          }),
          expect.objectContaining({
            field: 'customsDescription',
            itemName: 'Incomplete Item'
          }),
          expect.objectContaining({
            field: 'unitValueCad',
            itemName: 'Incomplete Item'
          }),
          expect.objectContaining({
            field: 'massGramsEach',
            itemName: 'Incomplete Item'
          })
        ])
      );
    });

    test('Digital items are skipped during validation', () => {
      const result = validateCustomsData([digitalItem], 'US', 'CA');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('Mixed digital and physical items validates only physical', () => {
      const result = validateCustomsData([digitalItem, incompletePhysicalItem], 'US', 'CA');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            itemName: 'Incomplete Item'
          })
        ])
      );
      
      // Should not have errors for digital item
      expect(result.errors.every(error => error.itemName !== 'Digital Frequency Pack')).toBe(true);
    });
  });

  describe('Non-DDP shipments', () => {
    test('Non-US destinations pass validation regardless of completeness', () => {
      const result = validateCustomsData([incompletePhysicalItem], 'DE', 'CA');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.isDdpRequired).toBe(false);
    });

    test('Domestic shipments pass validation', () => {
      const result = validateCustomsData([incompletePhysicalItem], 'CA', 'CA');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Customs content details generation', () => {
    test('Generates correct format for physical items', () => {
      const contentDetails = generateCustomsContentDetails([completePhysicalItem]);
      
      expect(contentDetails).toHaveLength(1);
      expect(contentDetails[0]).toEqual({
        description: 'Sterling silver healing pendant',
        quantity: 1,
        'unit-weight': 0.025, // 25g converted to kg
        'unit-value': 49.99,
        'hs-tariff-code': '7117.11.0000',
        'country-of-origin': 'CA'
      });
    });

    test('Filters out digital items', () => {
      const contentDetails = generateCustomsContentDetails([digitalItem, completePhysicalItem]);
      
      expect(contentDetails).toHaveLength(1);
      expect(contentDetails[0].description).toBe('Sterling silver healing pendant');
    });

    test('Handles missing customs description by using product name', () => {
      const itemWithoutDescription = {
        ...completePhysicalItem,
        customsDescription: undefined
      };
      
      const contentDetails = generateCustomsContentDetails([itemWithoutDescription]);
      
      expect(contentDetails[0].description).toBe('Healing Pendant');
    });

    test('Converts grams to kilograms correctly', () => {
      const heavyItem = {
        ...completePhysicalItem,
        massGramsEach: 1500 // 1.5kg
      };
      
      const contentDetails = generateCustomsContentDetails([heavyItem]);
      
      expect(contentDetails[0]['unit-weight']).toBe(1.5);
    });
  });

  describe('Edge cases', () => {
    test('Empty items array', () => {
      const result = validateCustomsData([], 'US', 'CA');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('Only digital items to US', () => {
      const result = validateCustomsData([digitalItem, digitalItem], 'US', 'CA');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('Null/undefined values handled gracefully', () => {
      const itemWithNulls: CustomsItem = {
        hsCode: null as any,
        countryOfOrigin: undefined as any,
        customsDescription: '',
        unitValueCad: null as any,
        massGramsEach: undefined as any,
        quantity: 1,
        name: 'Null Item',
        isDigital: false
      };
      
      const result = validateCustomsData([itemWithNulls], 'US', 'CA');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
