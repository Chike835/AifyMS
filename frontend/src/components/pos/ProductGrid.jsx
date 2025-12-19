import ProductCard from './ProductCard';
import { Package } from 'lucide-react';

const ProductGrid = ({ products, onAddToCart, isLoading }) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="aspect-square bg-gray-200 rounded-xl mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (!products || products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm">Try adjusting your search or category filter</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {products.map((product) => (
                <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={onAddToCart}
                />
            ))}
        </div>
    );
};

export default ProductGrid;
