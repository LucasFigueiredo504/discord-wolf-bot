const { Character } = require("./character");

/* Character.belongsToMany(Item, {
	through: CharacterItem,
	foreignKey: "CharacterId",
});
Item.belongsToMany(Character, {
	through: CharacterItem,
	foreignKey: "ItemId",
});

Character.belongsTo(Vehicle, { foreignKey: "vehicleId" });
Vehicle.hasOne(Character, { foreignKey: "vehicleId" }); */

module.exports = { Character };
