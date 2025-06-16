const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.ObjectId;

const OrderSchema = new mongoose.Schema(
  {
    userID: {
      type: ObjectId,
      ref: 'User',
    },
    firstName: { // Added firstName field
      type: String,
      required: true,
    },
    lastName: { // Added lastName field
      type: String,
      required: true,
    },
    products: [
      {
        productID: {
          type: ObjectId,
          ref: 'Product',
          required: true,
        },
        title: {  // Added title field
          type: String,
          required: true,
        },
        SCQ: {
          type: String,
        },
      },
    ],
    amount: {
      type: Number,
      required: true,
    },
    address: {
      type: Object,
      required: true,
    },
    contact: {  // Added contact field
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
