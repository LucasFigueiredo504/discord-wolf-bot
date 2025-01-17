const { sequelize } = require("../db-connection");
const Sequelize = require("sequelize");

const Vehicle = sequelize.define("vehicles", {
	id: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true,
	},
	name: Sequelize.STRING,
	type: Sequelize.STRING, // Example: "Spaceship", "Car", "Bike"
	armor: Sequelize.INTEGER,
	damage: Sequelize.INTEGER,
	class: Sequelize.ENUM("C", "B", "A", "SUPER", "MEGA", "OMEGA"),
});

module.exports = { Vehicle };
