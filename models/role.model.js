const { DataTypes, sequelize } = require('../lib/index');

const role = sequelize.define('role', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = { role };
