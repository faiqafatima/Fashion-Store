const mongoose = require('mongoose')

const ProductSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
		unique: true,
	},
	description: {
		type: String,
		required: true,
	},
	images: {
		type: [String],  // Array of strings for multiple image links
		required: true,
		validate: [arrayLimit, '{PATH} exceeds the limit of 3'],  // Custom validation
	},
	price: { 
		type: Number,
		required: true,
	},
	inStock: {
		type: Boolean,
		default: true,
	},
	category: {
		type: String,
		required: true,
	},
	SCQ: { 
		type: Array 
	},
	discountPercentage: {
		type: Number,
		min: 0,
		max: 100,
		default: 0
	},
	gender: {
		type: String,
		required: true,
		enum: ['men', 'women', 'Unisex'], // Restrict to specific values
	},
}, 
	{ timestamps: true }
)

// Custom validation to limit the number of images
function arrayLimit(val) {
	return val.length <= 8;
}

module.exports = mongoose.model("Product", ProductSchema)
