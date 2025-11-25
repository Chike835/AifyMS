import sequelize from '../config/db.js';
import { Op, fn, col, literal } from 'sequelize';
import { PaymentAccount, AccountTransaction, Branch, User } from '../models/index.js';

/**
 * GET /api/payment-accounts
 * List all payment accounts (branch-filtered)
 */
export const getPaymentAccounts = async (req, res, next) => {
  try {
    const where = {};

    // Branch filtering (except for Super Admin)
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      where.branch_id = req.user.branch_id;
    }

    const accounts = await PaymentAccount.findAll({
      where,
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({ accounts });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment-accounts/:id
 * Get single payment account with transaction summary
 */
export const getPaymentAccountById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const account = await PaymentAccount.findByPk(id, {
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ]
    });

    if (!account) {
      return res.status(404).json({ error: 'Payment account not found' });
    }

    // Branch access check
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      if (account.branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get transaction count and recent transactions
    const transactionCount = await AccountTransaction.count({
      where: { account_id: id }
    });

    const recentTransactions = await AccountTransaction.findAll({
      where: { account_id: id },
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    res.json({
      account,
      transaction_count: transactionCount,
      recent_transactions: recentTransactions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment-accounts
 * Create new payment account
 */
export const createPaymentAccount = async (req, res, next) => {
  try {
    const {
      name,
      account_type,
      account_number,
      bank_name,
      opening_balance,
      branch_id
    } = req.body;

    // Validation
    if (!name || !account_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, account_type' 
      });
    }

    const validTypes = ['cash', 'bank', 'mobile_money', 'pos_terminal'];
    if (!validTypes.includes(account_type)) {
      return res.status(400).json({ 
        error: `Invalid account_type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Branch assignment
    let finalBranchId = branch_id;
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      finalBranchId = req.user.branch_id;
    }

    // Create account
    const account = await PaymentAccount.create({
      name,
      account_type,
      account_number: account_number || null,
      bank_name: bank_name || null,
      opening_balance: opening_balance || 0,
      current_balance: opening_balance || 0,
      branch_id: finalBranchId || null,
      is_active: true
    });

    // If opening balance > 0, create initial deposit transaction
    if (opening_balance > 0) {
      await AccountTransaction.create({
        account_id: account.id,
        transaction_type: 'deposit',
        amount: opening_balance,
        notes: 'Opening balance',
        user_id: req.user.id
      });
    }

    const accountWithDetails = await PaymentAccount.findByPk(account.id, {
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ]
    });

    res.status(201).json({
      message: 'Payment account created successfully',
      account: accountWithDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/payment-accounts/:id
 * Update payment account details
 */
export const updatePaymentAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      account_number,
      bank_name,
      is_active
    } = req.body;

    const account = await PaymentAccount.findByPk(id);

    if (!account) {
      return res.status(404).json({ error: 'Payment account not found' });
    }

    // Branch access check
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      if (account.branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Update fields
    if (name !== undefined) account.name = name;
    if (account_number !== undefined) account.account_number = account_number;
    if (bank_name !== undefined) account.bank_name = bank_name;
    if (is_active !== undefined) account.is_active = is_active;

    await account.save();

    const accountWithDetails = await PaymentAccount.findByPk(account.id, {
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ]
    });

    res.json({
      message: 'Payment account updated successfully',
      account: accountWithDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payment-accounts/:id/transactions
 * Get transaction history for an account
 */
export const getAccountTransactions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, transaction_type, limit = 50, offset = 0 } = req.query;

    // Verify account exists and check access
    const account = await PaymentAccount.findByPk(id);
    if (!account) {
      return res.status(404).json({ error: 'Payment account not found' });
    }

    // Branch access check
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      if (account.branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const where = { account_id: id };

    if (start_date && end_date) {
      where.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + 'T23:59:59')]
      };
    }

    if (transaction_type) {
      where.transaction_type = transaction_type;
    }

    const { count, rows: transactions } = await AccountTransaction.findAndCountAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      transactions,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payment-accounts/:id/deposit
 * Record manual deposit
 */
export const recordDeposit = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const account = await PaymentAccount.findByPk(id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!account) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Payment account not found' });
    }

    // Branch access check
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      if (account.branch_id !== req.user.branch_id) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Create transaction
    const accountTransaction = await AccountTransaction.create({
      account_id: id,
      transaction_type: 'deposit',
      amount,
      notes: notes || null,
      user_id: req.user.id
    }, { transaction });

    // Update account balance
    account.current_balance = parseFloat(account.current_balance) + parseFloat(amount);
    await account.save({ transaction });

    await transaction.commit();

    const transactionWithDetails = await AccountTransaction.findByPk(accountTransaction.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'email'] },
        { model: PaymentAccount, as: 'account', attributes: ['id', 'name', 'current_balance'] }
      ]
    });

    res.status(201).json({
      message: 'Deposit recorded successfully',
      transaction: transactionWithDetails
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * POST /api/payment-accounts/:id/withdrawal
 * Record manual withdrawal
 */
export const recordWithdrawal = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const account = await PaymentAccount.findByPk(id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!account) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Payment account not found' });
    }

    // Branch access check
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      if (account.branch_id !== req.user.branch_id) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Check sufficient balance
    if (parseFloat(account.current_balance) < parseFloat(amount)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create transaction
    const accountTransaction = await AccountTransaction.create({
      account_id: id,
      transaction_type: 'withdrawal',
      amount,
      notes: notes || null,
      user_id: req.user.id
    }, { transaction });

    // Update account balance
    account.current_balance = parseFloat(account.current_balance) - parseFloat(amount);
    await account.save({ transaction });

    await transaction.commit();

    const transactionWithDetails = await AccountTransaction.findByPk(accountTransaction.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'email'] },
        { model: PaymentAccount, as: 'account', attributes: ['id', 'name', 'current_balance'] }
      ]
    });

    res.status(201).json({
      message: 'Withdrawal recorded successfully',
      transaction: transactionWithDetails
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * POST /api/payment-accounts/transfer
 * Transfer funds between accounts
 */
export const transferBetweenAccounts = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { from_account_id, to_account_id, amount, notes } = req.body;

    if (!from_account_id || !to_account_id || !amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields: from_account_id, to_account_id, amount' 
      });
    }

    if (from_account_id === to_account_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Cannot transfer to the same account' });
    }

    // Get both accounts with locks
    const fromAccount = await PaymentAccount.findByPk(from_account_id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    const toAccount = await PaymentAccount.findByPk(to_account_id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!fromAccount || !toAccount) {
      await transaction.rollback();
      return res.status(404).json({ error: 'One or both accounts not found' });
    }

    // Branch access check
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      if (fromAccount.branch_id !== req.user.branch_id || toAccount.branch_id !== req.user.branch_id) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Check sufficient balance
    if (parseFloat(fromAccount.current_balance) < parseFloat(amount)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Insufficient balance in source account' });
    }

    // Create withdrawal transaction
    await AccountTransaction.create({
      account_id: from_account_id,
      transaction_type: 'withdrawal',
      amount,
      notes: notes ? `Transfer to ${toAccount.name}: ${notes}` : `Transfer to ${toAccount.name}`,
      user_id: req.user.id
    }, { transaction });

    // Create deposit transaction
    await AccountTransaction.create({
      account_id: to_account_id,
      transaction_type: 'deposit',
      amount,
      notes: notes ? `Transfer from ${fromAccount.name}: ${notes}` : `Transfer from ${fromAccount.name}`,
      user_id: req.user.id
    }, { transaction });

    // Update balances
    fromAccount.current_balance = parseFloat(fromAccount.current_balance) - parseFloat(amount);
    toAccount.current_balance = parseFloat(toAccount.current_balance) + parseFloat(amount);
    await fromAccount.save({ transaction });
    await toAccount.save({ transaction });

    await transaction.commit();

    res.json({
      message: 'Transfer completed successfully',
      from_account: {
        id: fromAccount.id,
        name: fromAccount.name,
        new_balance: fromAccount.current_balance
      },
      to_account: {
        id: toAccount.id,
        name: toAccount.name,
        new_balance: toAccount.current_balance
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * GET /api/payment-accounts/:id/report
 * Get comprehensive account report with summary statistics
 */
export const getAccountReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Verify account exists and check access
    const account = await PaymentAccount.findByPk(id, {
      include: [
        { model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }
      ]
    });

    if (!account) {
      return res.status(404).json({ error: 'Payment account not found' });
    }

    // Branch access check
    if (req.user?.branch_id && req.user?.role_name !== 'Super Admin') {
      if (account.branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Build date filter for report period
    const reportWhere = { account_id: id };
    if (start_date && end_date) {
      reportWhere.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date + 'T23:59:59')]
      };
    }

    // Calculate opening balance (balance before start_date)
    let openingBalance = parseFloat(account.opening_balance || 0);
    if (start_date) {
      const transactionsBeforeStart = await AccountTransaction.findAll({
        where: {
          account_id: id,
          created_at: {
            [Op.lt]: new Date(start_date)
          }
        },
        attributes: [
          'transaction_type',
          [fn('SUM', col('amount')), 'total']
        ],
        group: ['transaction_type'],
        raw: true
      });

      transactionsBeforeStart.forEach(tx => {
        const amount = parseFloat(tx.total || 0);
        if (tx.transaction_type === 'deposit' || tx.transaction_type === 'payment_received') {
          openingBalance += amount;
        } else if (tx.transaction_type === 'withdrawal' || tx.transaction_type === 'payment_made') {
          openingBalance -= amount;
        } else if (tx.transaction_type === 'transfer') {
          // Transfer type needs to be handled based on account context
          // For now, we'll need to check if it's incoming or outgoing
          // Since transfers create separate deposit/withdrawal transactions, this may not be used
          // But we'll treat it as neutral for now
        }
      });
    }

    // Calculate summary statistics for the report period
    const totalDeposits = await AccountTransaction.sum('amount', {
      where: {
        ...reportWhere,
        transaction_type: {
          [Op.in]: ['deposit', 'payment_received']
        }
      }
    }) || 0;

    const totalWithdrawals = await AccountTransaction.sum('amount', {
      where: {
        ...reportWhere,
        transaction_type: {
          [Op.in]: ['withdrawal', 'payment_made']
        }
      }
    }) || 0;

    const transactionCount = await AccountTransaction.count({
      where: reportWhere
    });

    const netChange = parseFloat(totalDeposits) - parseFloat(totalWithdrawals);

    // Calculate ending balance (opening balance + net change for the period)
    // If no date range, use current balance; otherwise calculate from opening + net change
    const endingBalance = start_date && end_date 
      ? openingBalance + netChange 
      : parseFloat(account.current_balance || 0);

    // Group transactions by type
    const transactionsByType = await AccountTransaction.findAll({
      attributes: [
        'transaction_type',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: reportWhere,
      group: ['transaction_type'],
      raw: true
    });

    const byType = {};
    transactionsByType.forEach(tx => {
      byType[tx.transaction_type] = {
        total: parseFloat(tx.total || 0),
        count: parseInt(tx.count || 0)
      };
    });

    // Get recent transactions with user details
    const transactions = await AccountTransaction.findAll({
      where: reportWhere,
      include: [
        { model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 100
    });

    res.json({
      account: {
        id: account.id,
        name: account.name,
        account_type: account.account_type,
        account_number: account.account_number,
        bank_name: account.bank_name,
        branch: account.branch
      },
      summary: {
        opening_balance: openingBalance,
        current_balance: endingBalance,
        total_deposits: parseFloat(totalDeposits),
        total_withdrawals: parseFloat(totalWithdrawals),
        net_change: netChange,
        transaction_count: transactionCount
      },
      by_type: byType,
      transactions: transactions.map(tx => ({
        id: tx.id,
        created_at: tx.created_at,
        transaction_type: tx.transaction_type,
        amount: parseFloat(tx.amount),
        notes: tx.notes,
        user: tx.user ? {
          id: tx.user.id,
          full_name: tx.user.full_name,
          email: tx.user.email
        } : null
      }))
    });
  } catch (error) {
    next(error);
  }
};



