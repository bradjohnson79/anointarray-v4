

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe,
  Package,
  Hash,
  FileText,
  DollarSign,
  Scale,
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';

interface CustomsData {
  hsCode: string;
  countryOfOrigin: string;
  customsDescription: string;
  defaultCustomsValueCad: number;
  massGrams: number;
}

interface CustomsCompliancePanelProps {
  productData: CustomsData;
  isPhysical: boolean;
  isDigital: boolean;
  productName: string;
  onChange: (data: CustomsData) => void;
}

const COUNTRY_OPTIONS = [
  { code: 'CA', name: 'Canada' },
  { code: 'US', name: 'United States' },
  { code: 'CN', name: 'China' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
];

export default function CustomsCompliancePanel({
  productData,
  isPhysical,
  isDigital,
  productName,
  onChange
}: CustomsCompliancePanelProps) {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const updateField = (field: keyof CustomsData, value: string | number) => {
    const updated = { ...productData, [field]: value };
    onChange(updated);
    validateData(updated);
  };

  const validateData = (data: CustomsData) => {
    const errors: string[] = [];

    if (isPhysical) {
      if (!data.hsCode?.trim()) {
        errors.push('HS Code is required for physical products');
      }
      if (!data.countryOfOrigin?.trim()) {
        errors.push('Country of origin is required for physical products');
      }
      if (!data.customsDescription?.trim()) {
        errors.push('Customs description is required for physical products');
      }
      if (!data.defaultCustomsValueCad || data.defaultCustomsValueCad <= 0) {
        errors.push('Default customs value must be greater than $0');
      }
      if (!data.massGrams || data.massGrams <= 0) {
        errors.push('Mass in grams is required for physical products');
      }
    }

    setValidationErrors(errors);
  };

  const isCompliant = isDigital || (isPhysical && validationErrors.length === 0 && productData.hsCode?.trim());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Globe className="h-6 w-6 text-blue-400 mr-3" />
          <h3 className="text-xl font-semibold text-white">
            Customs & Compliance
          </h3>
        </div>
        <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
          isCompliant 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {isCompliant ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Compliant
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 mr-1" />
              Needs Attention
            </>
          )}
        </div>
      </div>

      {isDigital && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
            <div>
              <h4 className="text-blue-400 font-medium mb-1">Digital Product</h4>
              <p className="text-blue-300 text-sm">
                Digital products don't require customs declarations for international shipping.
                Only Canadian customers will be charged 5% GST on digital products.
              </p>
            </div>
          </div>
        </div>
      )}

      {isPhysical && (
        <div className="space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Package className="h-5 w-5 text-amber-400 mr-3 mt-0.5" />
              <div>
                <h4 className="text-amber-400 font-medium mb-1">Physical Product Requirements</h4>
                <p className="text-amber-300 text-sm">
                  All physical products require complete customs information for international shipping (especially USA).
                  This ensures DDP (Delivered Duty Paid) compliance with Canada Post.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* HS Code */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Hash className="h-4 w-4 inline mr-2" />
                HS Code (Harmonized System)
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="text"
                value={productData.hsCode || ''}
                onChange={(e) => updateField('hsCode', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g., 7117.11.0000"
              />
              <p className="text-xs text-gray-400 mt-1">
                Find HS codes at <a href="https://www.cbsa-asfc.gc.ca/trade-commerce/tariff-tarif/menu-eng.html" 
                target="_blank" className="text-blue-400 hover:text-blue-300">CBSA Tariff Finder</a>
              </p>
            </div>

            {/* Country of Origin */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Globe className="h-4 w-4 inline mr-2" />
                Country of Origin
                <span className="text-red-400 ml-1">*</span>
              </label>
              <select
                value={productData.countryOfOrigin || ''}
                onChange={(e) => updateField('countryOfOrigin', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select country...</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Customs Description */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <FileText className="h-4 w-4 inline mr-2" />
                Customs Description
                <span className="text-red-400 ml-1">*</span>
              </label>
              <textarea
                value={productData.customsDescription || ''}
                onChange={(e) => updateField('customsDescription', e.target.value)}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Detailed description of the product for customs (e.g., 'Sterling silver healing pendant with amethyst stone')"
              />
              <p className="text-xs text-gray-400 mt-1">
                Be specific and accurate. This appears on customs forms.
              </p>
            </div>

            {/* Default Value */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <DollarSign className="h-4 w-4 inline mr-2" />
                Default Customs Value (CAD)
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={productData.defaultCustomsValueCad || ''}
                onChange={(e) => updateField('defaultCustomsValueCad', parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-400 mt-1">
                Declared value for customs (usually retail price)
              </p>
            </div>

            {/* Mass */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Scale className="h-4 w-4 inline mr-2" />
                Mass (grams)
                <span className="text-red-400 ml-1">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={productData.massGrams || ''}
                onChange={(e) => updateField('massGrams', parseInt(e.target.value) || 0)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="0"
              />
              <p className="text-xs text-gray-400 mt-1">
                Weight for shipping and customs calculations
              </p>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-red-400 font-medium mb-2">Validation Errors</h4>
                  <ul className="text-red-300 text-sm space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
