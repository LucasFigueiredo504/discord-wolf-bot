const { sequelize } = require("../db-connection");
const Sequelize = require("sequelize");

const Character = sequelize.define("characters", {
	id: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true,
	},
	name: {
		type: Sequelize.STRING,
		unique: true,
	},
	description: Sequelize.TEXT,
	max_health: Sequelize.INTEGER,
	max_energy: Sequelize.INTEGER,
	current_health: Sequelize.INTEGER,
	current_energy: Sequelize.INTEGER,
	class: Sequelize.ENUM("C", "B", "A", "SUPER", "MEGA", "OMEGA"),
	username: Sequelize.STRING,
	vehicleId: {
		type: Sequelize.INTEGER,
		references: {
			model: "vehicles",
			key: "id",
		},
		allowNull: true,
	},
});

module.exports = { Character };
