const mongoose = require("mongoose");

const ObjectId = mongoose.Schema.ObjectId;

const CartSchema = new mongoose.Schema(
  {
    userID: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        uniqueCartKey: {
          // Add uniqueCartKey field
          type: String,
          required: true,
          },
        productID: {
          type: ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
        },
        size: {
          // Add size field
          type: String, // Change to Number or specific format if needed
          required: true,
        },
        color: {
          // Add color field
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);
