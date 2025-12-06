import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/passwordUtils.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Password hash is required'
      },
      notEmpty: {
        msg: 'Password hash cannot be empty'
      }
    }
  },
  full_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  role_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'roles',
      key: 'id'
    }
  },
  branch_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  base_salary: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: false,
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash && !user.password_hash.startsWith('$2')) {
        // Only hash if it's not already hashed (bcrypt hashes start with $2a$ or $2b$)
        user.password_hash = await hashPassword(user.password_hash);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash') && !user.password_hash.startsWith('$2')) {
        user.password_hash = await hashPassword(user.password_hash);
      }
      user.updated_at = new Date();
    }
  }
});

// Instance method to check password
User.prototype.checkPassword = async function (password) {


  if (!this.password_hash) {

    return false;
  }



  if (!this.password_hash.startsWith('$2')) {
    return false;
  }

  if (!password) {

    return false;
  }

  try {
    const result = await comparePassword(password, this.password_hash);

    return result;
  } catch (error) {

    throw error;
  }
};

export default User;
