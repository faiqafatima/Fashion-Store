const router = require("express").Router();
const ObjectId = require('mongoose').Types.ObjectId;

const { verifyToken } = require('../middlewares/verifyAuth');
const Cart = require("../models/Cart.model");
const Product = require("../models/Product.model");

router.get("/payment", verifyToken, async (req, res) => {
  const cart = await Cart.findOne({ userID: ObjectId(req.user.uid) });

  if (!cart || (cart.products.length <= 0)) {
    return res.status(400).json(checkoutResponse.cartIsEmpty);
  }

  let cartPopulated = await cart.populate({
    path: 'products.productID',
    select: ['title', 'price']
  });

  let cartTotal = 0;
  for (product of cartPopulated.products) {
    cartTotal += product.quantity * product.productID.price;
  }

  // Respond with final order details (without any payment processing)
  return res.json({
    finalOrder: {
      ...cartPopulated._doc,
      amount: cartTotal,
    },
  });
});

const checkoutResponse = {
  cartIsEmpty: {
    status: "error",
    message: "cannot checkout an empty cart",
  },
};

module.exports = router;
