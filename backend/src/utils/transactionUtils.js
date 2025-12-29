/**
 * Transaction utility functions for safe transaction handling
 */

/**
 * Safely rollback a transaction, checking if it's already finished
 * @param {Object} transaction - Sequelize transaction object
 * @returns {Promise<void>}
 */
export const safeRollback = async (transaction) => {
  if (transaction && !transaction.finished) {
    try {
      await transaction.rollback();
    } catch (error) {
      // Log but don't throw - transaction may already be rolled back
      console.error('Transaction rollback error:', error);
    }
  }
};








