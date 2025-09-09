

import { calculateCanadianTaxes, TaxCalculationItem } from '../canadian-taxes';

describe('Canadian Tax Calculation', () => {
  const mockPhysicalItem: TaxCalculationItem = {
    isDigital: false,
    priceCents: 10000, // $100.00
    quantity: 1
  };

  const mockDigitalItem: TaxCalculationItem = {
    isDigital: true,
    priceCents: 5000, // $50.00
    quantity: 1
  };

  describe('Physical goods taxation by province', () => {
    test('Ontario - applies 13% HST', () => {
      const result = calculateCanadianTaxes({
        destinationProvince: 'ON',
        buyerCountry: 'CA',
        items: [mockPhysicalItem]
      });

      expect(result.hstCents).toBe(1300); // 13% of $100
      expect(result.gstCents).toBe(0);
      expect(result.pstCents).toBe(0);
      expect(result.totalTaxCents).toBe(1300);
    });

    test('Alberta - applies 5% GST only', () => {
      const result = calculateCanadianTaxes({
        destinationProvince: 'AB',
        buyerCountry: 'CA',
        items: [mockPhysicalItem]
      });

      expect(result.gstCents).toBe(500); // 5% of $100
      expect(result.hstCents).toBe(0);
      expect(result.pstCents).toBe(0);
      expect(result.totalTaxCents).toBe(500);
    });

    test('British Columbia - applies 5% GST + 7% PST', () => {
      const result = calculateCanadianTaxes({
        destinationProvince: 'BC',
        buyerCountry: 'CA',
        items: [mockPhysicalItem]
      });

      expect(result.gstCents).toBe(500); // 5% of $100
      expect(result.pstCents).toBe(700); // 7% of $100
      expect(result.hstCents).toBe(0);
      expect(result.totalTaxCents).toBe(1200);
    });

    test('Quebec - applies 5% GST + 9.975% QST', () => {
      const result = calculateCanadianTaxes({
        destinationProvince: 'QC',
        buyerCountry: 'CA',
        items: [mockPhysicalItem]
      });

      expect(result.gstCents).toBe(500); // 5% of $100
      expect(result.pstCents).toBe(997); // 9.975% of $100 (rounded)
      expect(result.hstCents).toBe(0);
      expect(result.totalTaxCents).toBe(1497);
    });
  });

  describe('Digital goods taxation', () => {
    test('Digital products - 5% GST only regardless of province', () => {
      const provinces = ['ON', 'BC', 'QC', 'AB'];
      
      provinces.forEach(province => {
        const result = calculateCanadianTaxes({
          destinationProvince: province,
          buyerCountry: 'CA',
          items: [mockDigitalItem]
        });

        expect(result.gstCents).toBe(250); // 5% of $50
        expect(result.hstCents).toBe(0);
        expect(result.pstCents).toBe(0);
        expect(result.totalTaxCents).toBe(250);
      });
    });
  });

  describe('International orders', () => {
    test('US customers - no tax applied', () => {
      const result = calculateCanadianTaxes({
        destinationProvince: 'CA', // This should be ignored
        buyerCountry: 'US',
        items: [mockPhysicalItem, mockDigitalItem]
      });

      expect(result.gstCents).toBe(0);
      expect(result.hstCents).toBe(0);
      expect(result.pstCents).toBe(0);
      expect(result.totalTaxCents).toBe(0);
    });

    test('European customers - no tax applied', () => {
      const result = calculateCanadianTaxes({
        destinationProvince: 'ON',
        buyerCountry: 'DE',
        items: [mockPhysicalItem]
      });

      expect(result.totalTaxCents).toBe(0);
    });
  });

  describe('Mixed cart scenarios', () => {
    test('Mixed physical and digital items in Ontario', () => {
      const result = calculateCanadianTaxes({
        destinationProvince: 'ON',
        buyerCountry: 'CA',
        items: [mockPhysicalItem, mockDigitalItem]
      });

      expect(result.gstCents).toBe(250); // 5% GST on digital item only
      expect(result.hstCents).toBe(1300); // 13% HST on physical item only
      expect(result.totalTaxCents).toBe(1550);
    });

    test('Multiple quantities', () => {
      const multiQuantityItem: TaxCalculationItem = {
        isDigital: false,
        priceCents: 2500, // $25.00 each
        quantity: 3
      };

      const result = calculateCanadianTaxes({
        destinationProvince: 'ON',
        buyerCountry: 'CA',
        items: [multiQuantityItem]
      });

      // 13% HST on $75 total (3 x $25)
      expect(result.hstCents).toBe(975);
      expect(result.totalTaxCents).toBe(975);
    });
  });

  describe('Edge cases', () => {
    test('Unknown province throws error', () => {
      expect(() => {
        calculateCanadianTaxes({
          destinationProvince: 'XX',
          buyerCountry: 'CA',
          items: [mockPhysicalItem]
        });
      }).toThrow('Unsupported province: XX');
    });

    test('Empty items array', () => {
      const result = calculateCanadianTaxes({
        destinationProvince: 'ON',
        buyerCountry: 'CA',
        items: []
      });

      expect(result.totalTaxCents).toBe(0);
      expect(result.breakdownByItem).toHaveLength(0);
    });

    test('Rounding is consistent', () => {
      const oddPriceItem: TaxCalculationItem = {
        isDigital: false,
        priceCents: 333, // $3.33
        quantity: 1
      };

      const result = calculateCanadianTaxes({
        destinationProvince: 'ON',
        buyerCountry: 'CA',
        items: [oddPriceItem]
      });

      // 13% of $3.33 = $0.4329, should round to 43 cents
      expect(result.hstCents).toBe(43);
    });
  });
});
