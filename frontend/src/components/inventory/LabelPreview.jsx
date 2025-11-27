import { Printer } from 'lucide-react';

const LabelPreview = ({ labels, onPrint }) => {
  const formatQuantity = (qty) => {
    return parseFloat(qty).toFixed(3);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Label Preview</h3>
        <button
          onClick={onPrint}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Printer className="h-5 w-5" />
          <span>Print Labels</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {labels.map((label, index) => (
          <div
            key={label.instance_id || index}
            className="border-2 border-gray-300 rounded-lg p-4 bg-white"
            style={{ 
              width: '100%',
              minHeight: '150px',
              pageBreakInside: 'avoid'
            }}
          >
            <div className="text-center space-y-2">
              <div className="text-xs text-gray-500">INSTANCE CODE</div>
              <div className="text-xl font-bold text-gray-900">{label.instance_code}</div>
              
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="text-xs text-gray-500">PRODUCT</div>
                <div className="text-sm font-semibold text-gray-900">{label.product_name}</div>
                <div className="text-xs text-gray-600">SKU: {label.product_sku}</div>
              </div>
              
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="text-xs text-gray-500">QUANTITY</div>
                <div className="text-lg font-bold text-primary-600">
                  {formatQuantity(label.remaining_quantity)}
                </div>
              </div>
              
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="text-xs text-gray-500">BRANCH</div>
                <div className="text-xs text-gray-700">{label.branch_name}</div>
              </div>
              
              {/* Barcode placeholder - in production, use a barcode library */}
              <div className="mt-3 pt-2 border-t border-gray-300">
                <div className="text-xs text-gray-400 mb-1">BARCODE</div>
                <div className="flex items-center justify-center h-12 bg-gray-100 rounded">
                  <div className="text-xs text-gray-500 font-mono">
                    {label.instance_code}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LabelPreview;









