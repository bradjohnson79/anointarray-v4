

'use client';

import { motion } from 'framer-motion';
import { 
  Calculator,
  MapPin,
  Badge,
  DollarSign,
  Truck,
  AlertCircle,
  CheckCircle,
  Info,
  Edit3
} from 'lucide-react';
import { formatTaxAmount, getProvinceName, getTaxTypeForProvince } from '@/lib/canadian-taxes';

interface TaxBreakdown {
  gst?: number;
  hst?: number;
  pst?: number;
  qst?: number;
}

interface CustomsItem {
  hsCode?: string;
  countryOfOrigin?: string;
  customsDescription?: string;
  unitValueCad?: number;
  massGramsEach?: number;
  quantity: number;
  name: string;
  isDigital: boolean;
}

interface TaxesDutiesPanelProps {
  buyerCountry: string;
  shippingCountry: string;
  shippingProvince?: string;
  taxSubtotalCad: number;
  taxBreakdown: TaxBreakdown;
  dutiesEstimatedCad: number;
  taxesEstimatedCad: number;
  incoterm: string;
  customsItems?: CustomsItem[];
  onEdit?: () => void;
  isEditable?: boolean;
}

export default function TaxesDutiesPanel({
  buyerCountry,
  shippingCountry,
  shippingProvince,
  taxSubtotalCad,
  taxBreakdown,
  dutiesEstimatedCad,
  taxesEstimatedCad,
  incoterm,
  customsItems = [],
  onEdit,
  isEditable = false
}: TaxesDutiesPanelProps) {

  const isCanadianOrder = buyerCountry === 'CA';
  const isUsOrder = shippingCountry === 'US';
  const isDdpRequired = isUsOrder && customsItems.some(item => !item.isDigital);

  const formatCurrency = (amount: number) => `$${formatTaxAmount(amount * 100)}`;

  const getCustomsComplianceStatus = () => {
    if (!isDdpRequired) return { status: 'not-required', message: 'Not Required' };
    
    const physicalItems = customsItems.filter(item => !item.isDigital);
    if (physicalItems.length === 0) return { status: 'not-required', message: 'Digital Only' };

    const incompleteItems = physicalItems.filter(item => 
      !item.hsCode || 
      !item.countryOfOrigin || 
      !item.customsDescription || 
      !item.unitValueCad || 
      !item.massGramsEach
    );

    if (incompleteItems.length > 0) {
      return { 
        status: 'incomplete', 
        message: `${incompleteItems.length} item(s) missing customs data` 
      };
    }

    return { status: 'complete', message: 'Complete' };
  };

  const complianceStatus = getCustomsComplianceStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Calculator className="h-6 w-6 text-green-400 mr-3" />
          <h3 className="text-xl font-semibold text-white">
            Taxes & Duties
          </h3>
        </div>
        {isEditable && (
          <button
            onClick={onEdit}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center text-sm"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Information */}
        <div className="space-y-4">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-gray-300">
              {buyerCountry === 'CA' ? 'Canadian' : 'International'} Customer
            </span>
          </div>

          {shippingProvince && (
            <div className="flex items-center">
              <Badge className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-gray-300">
                Shipping to: {getProvinceName(shippingProvince)}, {shippingCountry}
              </span>
            </div>
          )}

          {isCanadianOrder && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h4 className="text-green-400 font-medium mb-2">
                {shippingProvince ? getTaxTypeForProvince(shippingProvince) : 'Canadian Tax'} Applied
              </h4>
              <div className="space-y-2">
                {taxBreakdown.gst && (
                  <div className="flex justify-between">
                    <span className="text-green-300">GST (5%):</span>
                    <span className="text-green-300">{formatCurrency(taxBreakdown.gst)}</span>
                  </div>
                )}
                {taxBreakdown.hst && (
                  <div className="flex justify-between">
                    <span className="text-green-300">HST ({shippingProvince === 'ON' ? '13' : '15'}%):</span>
                    <span className="text-green-300">{formatCurrency(taxBreakdown.hst)}</span>
                  </div>
                )}
                {taxBreakdown.pst && (
                  <div className="flex justify-between">
                    <span className="text-green-300">PST:</span>
                    <span className="text-green-300">{formatCurrency(taxBreakdown.pst)}</span>
                  </div>
                )}
                {taxBreakdown.qst && (
                  <div className="flex justify-between">
                    <span className="text-green-300">QST (9.975%):</span>
                    <span className="text-green-300">{formatCurrency(taxBreakdown.qst)}</span>
                  </div>
                )}
                <div className="border-t border-green-500/30 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-green-400">Total Tax:</span>
                    <span className="text-green-400">{formatCurrency(taxSubtotalCad)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isCanadianOrder && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Info className="h-5 w-5 text-blue-400 mr-2" />
                <span className="text-blue-400 font-medium">Tax Exempt (Export)</span>
              </div>
              <p className="text-blue-300 text-sm">
                No Canadian taxes applied to international orders.
              </p>
            </div>
          )}
        </div>

        {/* DDP Information for US Orders */}
        {isUsOrder && (
          <div className="space-y-4">
            <div className="flex items-center">
              <Truck className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-gray-300">US Shipment - DDP Required</span>
            </div>

            <div className={`rounded-lg p-4 ${
              complianceStatus.status === 'complete' 
                ? 'bg-green-500/10 border border-green-500/20' 
                : complianceStatus.status === 'incomplete'
                ? 'bg-amber-500/10 border border-amber-500/20'
                : 'bg-gray-700/50 border border-gray-600'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">Customs Compliance</span>
                <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                  complianceStatus.status === 'complete' 
                    ? 'bg-green-500/20 text-green-400' 
                    : complianceStatus.status === 'incomplete'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-gray-600/20 text-gray-400'
                }`}>
                  {complianceStatus.status === 'complete' ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : complianceStatus.status === 'incomplete' ? (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <Info className="h-3 w-3 mr-1" />
                  )}
                  {complianceStatus.message}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Incoterm:</span>
                  <span className={`font-mono px-2 py-1 rounded text-xs ${
                    incoterm === 'DDP' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {incoterm}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-300">Est. Duties:</span>
                  <span className="text-white">
                    {dutiesEstimatedCad > 0 ? formatCurrency(dutiesEstimatedCad) : 'Included'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-300">Est. Taxes:</span>
                  <span className="text-white">
                    {taxesEstimatedCad > 0 ? formatCurrency(taxesEstimatedCad) : 'Included'}
                  </span>
                </div>
              </div>

              {complianceStatus.status === 'incomplete' && (
                <div className="mt-3 pt-3 border-t border-amber-500/30">
                  <p className="text-amber-300 text-xs">
                    Complete customs data required before creating shipping label.
                  </p>
                </div>
              )}
            </div>

            {customsItems.length > 0 && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h5 className="text-white font-medium mb-2">Customs Items Summary</h5>
                <div className="space-y-1">
                  {customsItems.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-300">
                        {item.name} {item.isDigital && '(Digital)'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        item.isDigital 
                          ? 'bg-blue-500/20 text-blue-400'
                          : (item.hsCode && item.countryOfOrigin && item.customsDescription)
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {item.isDigital ? 'Digital' : 
                         (item.hsCode && item.countryOfOrigin && item.customsDescription) ? 'Complete' : 'Incomplete'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
