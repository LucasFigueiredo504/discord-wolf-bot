const { sequelize } = require("../db-connection");
const Sequelize = require("sequelize");

const Item = sequelize.define("items", {
	id: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true,
	},
	name: Sequelize.STRING,
	type: Sequelize.STRING, // Example: "ore", "wepom", "armour",""
	defence: Sequelize.INTEGER,
	damage: Sequelize.INTEGER,
	class: Sequelize.ENUM("C", "B", "A", "SUPER", "MEGA", "OMEGA"),
});

module.exports = { Item };
