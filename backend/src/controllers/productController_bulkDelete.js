
/**
 * POST /api/products/:id/variants/bulk-delete
 * Delete multiple variants at once
 */
export const bulkDeleteVariants = async (req, res, next) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { variantIds } = req.body;

        if (!variantIds || !Array.isArray(variantIds) || variantIds.length === 0) {
            await safeRollback(transaction);
            return res.status(400).json({ error: 'No variant IDs provided' });
        }

        // Check strict parent-child ownership
        const variants = await ProductVariant.findAll({
            where: {
                id: variantIds,
                parent_product_id: id
            },
            include: [{ model: Product, as: 'child' }],
            transaction
        });

        if (variants.length !== variantIds.length) {
            await safeRollback(transaction);
            return res.status(400).json({ error: 'Some variants were not found or do not belong to this product' });
        }

        // Check stock for ALL variants before deleting any
        const childProductIds = variants.map(v => v.child?.id).filter(Boolean);

        if (childProductIds.length > 0) {
            // Check stock
            const stockCounts = await InventoryBatch.findAll({
                attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('remaining_quantity')), 'total_stock']],
                where: {
                    product_id: childProductIds,
                    status: 'in_stock'
                },
                group: ['product_id'],
                raw: true,
                transaction
            });

            const variantsWithStock = stockCounts.filter(s => parseFloat(s.total_stock) > 0);
            if (variantsWithStock.length > 0) {
                await safeRollback(transaction);
                return res.status(400).json({
                    error: `Cannot delete variants because some have existing stock (${variantsWithStock.length} variants impacted).`
                });
            }
        }

        // Delete variants
        await ProductVariant.destroy({
            where: {
                id: variantIds
            },
            transaction
        });

        // Optionally delete orphan child products here if needed, but for safety we keep them or rely on a cleanup job
        // However, if we don't delete them, they remain as "standard" products in the system but visible?
        // With `is_variant_child` = true, they will be hidden from the main list.
        // Ideally we should mark them as inactive or delete them if they were auto-generated.
        // Getting strict: Deleting the link is enough to "delete the variant".
        // If users want to fully delete the product data, they can do so individually or we can implement cascade.
        // For now, consistent with single delete: just destroy the link.

        await transaction.commit();
        res.json({ message: `Successfully deleted ${variantIds.length} variants` });

    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};
