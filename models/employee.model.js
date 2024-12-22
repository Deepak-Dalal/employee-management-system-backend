const { DataTypes, sequelize } = require('../lib/index');

const employee = sequelize.define('employee', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
});

module.exports = { employee };
