import { Package, Plus } from 'lucide-react';

const ProductCard = ({ product, onAdd }) => {
    const price = parseFloat(product.sale_price || 0);
    // Product is available if:
    // 1. Stock management is disabled (manage_stock === false) - always available
    // 2. Stock management is enabled and current_stock > 0
    const hasStock = product.manage_stock === false || product.type === 'service' || (product.current_stock && parseFloat(product.current_stock) > 0);

    return (
        <div
            onClick={() => hasStock && onAdd(product)}
            className={`
        group relative flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer overflow-hidden
        ${!hasStock ? 'opacity-60 grayscale' : ''}
      `}
        >
            {/* Image Container */}
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                        <Package className="h-12 w-12 opacity-50" />
                    </div>
                )}

                {/* Overlay Gradient on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Floating Add Button */}
                {hasStock && (
                    <div className="absolute bottom-3 right-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="bg-white text-primary-600 p-2 rounded-full shadow-lg hover:bg-primary-600 hover:text-white transition-colors">
                            <Plus className="h-5 w-5" />
                        </div>
                    </div>
                )}

                {/* Stock Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1">
                    {!hasStock && (
                        <span className="px-2 py-1 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm">
                            Out of Stock
                        </span>
                    )}
                    {product.type === 'variable' && (
                        <span className="px-2 py-1 bg-blue-500/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm">
                            Var
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col gap-1">
                <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2" title={product.name}>
                        {product.name}
                    </h3>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                    <p className="text-xs text-gray-400 font-medium">{product.sku}</p>
                    <p className="text-primary-600 font-bold text-base">
                        ₦{price.toLocaleString()}
                    </p>
                </div>

                {hasStock && product.manage_stock !== false && product.type !== 'service' && product.current_stock !== undefined && (
                    <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${parseFloat(product.current_stock) < 10 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, (parseFloat(product.current_stock) / 50) * 100)}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductCard;
