import { LayoutGrid } from 'lucide-react';

const CategoryTabs = ({ categories, selectedCategory, onSelectCategory }) => {
    return (
        <div className="w-full overflow-x-auto">
            {/* Container with proper scrolling */}
            <div className="flex items-center gap-3 pb-4 pt-2 px-1 min-w-max">
                {/* All Products Pill */}
                <button
                    onClick={() => onSelectCategory(null)}
                    className={`
            group flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex-shrink-0
            ${selectedCategory === null
                            ? 'bg-gray-900 text-white shadow-lg shadow-gray-200 scale-105 ring-2 ring-gray-900 ring-offset-2'
                            : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-gray-100 shadow-sm'
                        }
          `}
                >
                    <LayoutGrid className={`h-4 w-4 transition-colors ${selectedCategory === null ? 'text-white' : 'text-gray-400 group-hover:text-gray-900'}`} />
                    <span>All Items</span>
                </button>

                {/* Categories */}
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => onSelectCategory(category.id)}
                        className={`
              group relative px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 flex-shrink-0
              ${selectedCategory === category.id
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-200 scale-105 ring-2 ring-primary-600 ring-offset-2'
                                : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-gray-100 shadow-sm'
                            }
            `}
                    >
                        {category.name}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CategoryTabs;
