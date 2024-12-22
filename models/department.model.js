const { DataTypes, sequelize } = require('../lib/index');

const department = sequelize.define('department', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = { department };
