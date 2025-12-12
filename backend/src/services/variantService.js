import { Product, ProductVariant, ProductVariation, ProductVariationValue, Unit } from '../models/index.js';
import sequelize from '../config/db.js';

/**
 * Generate Cartesian Product of arrays
 * @param {Array} arrays - Array of arrays to combine
 * @returns {Array} - Array of combinations
 */
const cartesian = (arrays) => {
    return arrays.reduce((acc, curr) => {
        return acc.flatMap(x => curr.map(y => [...x, y]));
    }, [[]]);
};

/**
 * Generate variants for a variable product
 * @param {string} parentProductId - ID of the parent product
 * @param {Array} variationIds - IDs of variations to use (legacy/simple mode)
 * @param {Object} options - Options object (transaction, variationConfigs, etc.)
 * @param {Array} options.variationConfigs - Optional. Array of { variationId, valueIds: [] } to filter specific values.
 */
export const generateVariants = async (parentProductId, variationIds, options = {}) => {
    const transaction = options.transaction;
    const variationConfigs = options.variationConfigs || []; // [{ variationId: 1, valueIds: [1, 2] }]

    // 1. Fetch parent product
    const parentProduct = await Product.findByPk(parentProductId, { transaction });
    if (!parentProduct) throw new Error('Parent product not found');
    if (parentProduct.type !== 'variable') throw new Error('Product is not a variable product');

    // 2. Fetch variations and their values
    // We fetch all values for the selected variations first, then filter in memory
    // (easier than complex dynamic SQL for per-variation value filtering)
    const variations = await ProductVariation.findAll({
        where: { id: variationIds },
        include: [{ model: ProductVariationValue, as: 'values' }],
        order: [['name', 'ASC']], // Ensure consistent order for SKU generation
        transaction
    });

    if (variations.length === 0) throw new Error('No variations found');

    // 3. Prepare data for cartesian product
    // We need an array of arrays of values.
    // Each element in the top array corresponds to a variation.
    // inner array contains { variation: ..., value: ... } objects.
    const valueArrays = variations.map(v => {
        // Filter values if config exists for this variation
        let valuesToUse = v.values || [];

        const config = variationConfigs.find(c => String(c.variationId) === String(v.id));
        if (config && Array.isArray(config.valueIds) && config.valueIds.length > 0) {
            // Filter to only include selected value IDs
            valuesToUse = valuesToUse.filter(val => config.valueIds.includes(val.id));
        }

        if (valuesToUse.length === 0) {
            throw new Error(`No values selected for variation "${v.name}"`);
        }

        return valuesToUse.map(val => ({
            variationId: v.id,
            variationName: v.name,
            valueId: val.id,
            value: val.value
        }));
    });

    // 4. Generate combinations
    const combinations = cartesian(valueArrays);

    const createdVariants = [];
    const isDryRun = options.dryRun === true;

    // 5. Create products for each combination
    for (const combination of combinations) {
        // Generate SKU Suffix and Name Suffix
        // SKU: PARENT-VAR1-VAR2
        // Name: Parent Name - Var1 - Var2

        const skuSuffix = combination.map(c => c.value.toUpperCase().replace(/[^A-Z0-9]/g, '')).join('-');

        // Filter based on allowedSkuSuffixes if provided
        if (options.allowedSkuSuffixes && Array.isArray(options.allowedSkuSuffixes)) {
            if (!options.allowedSkuSuffixes.includes(skuSuffix)) {
                continue;
            }
        }

        const nameSuffix = combination.map(c => c.value).join(' - ');

        const variantSku = `${parentProduct.sku}-${skuSuffix}`;
        const variantName = `${parentProduct.name} - ${nameSuffix}`;

        // Variation Combination JSON for storage
        const variationCombination = {};
        combination.forEach(c => {
            variationCombination[c.variationName] = c.value;
        });

        if (isDryRun) {
            // Dry Run: Return simulated product object
            createdVariants.push({
                sku: variantSku,
                name: variantName,
                type: 'standard',
                sale_price: parentProduct.sale_price,
                cost_price: parentProduct.cost_price,
                current_stock: 0, // Placeholder
                sku_suffix: skuSuffix,
                variation_combination: variationCombination
            });
            continue;
        }

        // Check if variant already exists (by SKU or unique combination)
        // We check SKU primarily
        const existingProduct = await Product.findOne({
            where: { sku: variantSku },
            transaction
        });

        if (existingProduct) {
            // Check if link exists
            const existingLink = await ProductVariant.findOne({
                where: {
                    parent_product_id: parentProductId,
                    product_id: existingProduct.id
                },
                transaction
            });

            if (!existingLink) {
                await ProductVariant.create({
                    parent_product_id: parentProductId,
                    product_id: existingProduct.id,
                    variation_combination: variationCombination,
                    sku_suffix: skuSuffix
                }, { transaction });
            }

            createdVariants.push(existingProduct);
            continue;
        }

        // Create Child Product
        const childProduct = await Product.create({
            sku: variantSku,
            name: variantName,
            type: 'standard', // Child is a standard product that can be sold/stocked
            base_unit: parentProduct.base_unit,
            unit_id: parentProduct.unit_id,
            sale_price: parentProduct.sale_price,
            cost_price: parentProduct.cost_price,
            cost_price_inc_tax: parentProduct.cost_price_inc_tax,
            tax_rate: parentProduct.tax_rate,
            tax_rate_id: parentProduct.tax_rate_id,
            is_taxable: parentProduct.is_taxable,
            selling_price_tax_type: parentProduct.selling_price_tax_type,
            profit_margin: parentProduct.profit_margin,
            brand: parentProduct.brand,
            brand_id: parentProduct.brand_id,
            category: parentProduct.category,
            category_id: parentProduct.category_id,
            sub_category_id: parentProduct.sub_category_id,
            manage_stock: parentProduct.manage_stock,
            not_for_selling: false, // Usually variants are for selling
            attribute_default_values: parentProduct.attribute_default_values,
        }, { transaction });

        // Link in ProductVariants
        await ProductVariant.create({
            parent_product_id: parentProductId,
            product_id: childProduct.id,
            variation_combination: variationCombination,
            sku_suffix: skuSuffix
        }, { transaction });

        createdVariants.push(childProduct);
    }

    return createdVariants;
};
