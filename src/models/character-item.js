const { sequelize } = require("../db-connection");
const Sequelize = require("sequelize");
const { Character, Item } = require("./index");

const CharacterItem = sequelize.define("characterItem", {
	id: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true,
	},
	quantity: {
		type: Sequelize.INTEGER,
		defaultValue: 1,
	},
	equipped: {
		type: Sequelize.BOOLEAN,
		defaultValue: false,
	},
	CharacterId: {
		type: Sequelize.INTEGER,
		references: {
			model: Character,
			key: "id",
		},
	},
	ItemId: {
		type: Sequelize.INTEGER,
		references: {
			model: Item,
			key: "id",
		},
	},
});

module.exports = { CharacterItem };
