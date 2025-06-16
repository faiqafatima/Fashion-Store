const { Joi } = require('celebrate');

const MIN_PASSWORD_LENGTH = 6;
const ID_LENGTH = 24;
const ALLOWED_ORDER_STATUS = ['pending', 'shipped', 'in transit', 'delivered', 'returned'];
const ALLOWED_GENDER = ['men', 'women', 'Unisex']; // Gender validation options

module.exports = {
  auth: {
    login: Joi.object().keys({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }),
    register: Joi.object().keys({
      fullname: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(MIN_PASSWORD_LENGTH).required(),
    }),
  },
  user: {
    query: Joi.object().keys({
      new: Joi.boolean(),
    }),
    update: Joi.object().keys({
      fullname: Joi.string(),
      currentPassword: Joi.string(),
      newPassword: Joi.string().min(MIN_PASSWORD_LENGTH),
    }).with('newPassword', 'currentPassword'),
  },
  product: {
    query: Joi.object().keys({
      new: Joi.boolean(),
      category: Joi.string(),
    }),
    new: Joi.object().keys({
      title: Joi.string().required(),
      description: Joi.string().required(),
      images: Joi.any(), // For file uploads, validation handled by multer
      price: Joi.number().positive().required(),
      inStock: Joi.boolean().default(true),
      category: Joi.string().required(),
      SCQ: Joi.array().items(Joi.string()).single(),
      discountPercentage: Joi.number().min(0).max(100).default(0),
      gender: Joi.string().valid(...ALLOWED_GENDER).required(),
    }),
    update: Joi.object().keys({
      title: Joi.string(),
      description: Joi.string(),
      images: Joi.any(),
      price: Joi.number().positive(),
      inStock: Joi.boolean(),
      category: Joi.string(),
      size: Joi.array().items(Joi.string()).single(),
      color: Joi.array().items(Joi.string()).single(),
      gender: Joi.string().valid(...ALLOWED_GENDER),
    }),
  },
  order: {
    query: Joi.object().keys({
      status: Joi.string().valid(...ALLOWED_ORDER_STATUS),
    }),
    new: Joi.object().keys({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      products: Joi.array().items(
        Joi.object().keys({
          productID: Joi.string().length(ID_LENGTH).alphanum().required(),
          title: Joi.string().required(),
          SCQ: Joi.string().required(),
        }).required()
      ).single().min(1),
      amount: Joi.number().positive().required(),
      contact: Joi.string().required(),
      address: Joi.any().required(),
      status: Joi.string().valid(...ALLOWED_ORDER_STATUS),
      userID: Joi.string().length(ID_LENGTH).allow(null, '').optional(), // Allow null or empty for guest users
    }),
    update: Joi.object().keys({
      products: Joi.array().items(
        Joi.object().keys({
          productID: Joi.string().length(ID_LENGTH).alphanum().required(),
          title: Joi.string().required(),
          quantity: Joi.number().positive(),
        }).required()
      ).single(),
      amount: Joi.number().positive(),
      address: Joi.any(),
      status: Joi.string().valid(...ALLOWED_ORDER_STATUS),
    }),
  },
  cart: {
    new: Joi.object().keys({
      products: Joi.array().items(
        Joi.object().keys({
          uniqueCartKey: Joi.string().required(),
          productID: Joi.string().length(ID_LENGTH).alphanum().required(),
          quantity: Joi.number().positive().required(),
          size: Joi.string().required(),
          color: Joi.string().required(),
        }).required()
      ).single().min(1),
    }),
    update: Joi.object().keys({
      products: Joi.array().items(
        Joi.object().keys({
          uniqueCartKey: Joi.string().required(),
          productID: Joi.string().length(ID_LENGTH).alphanum().required(),
          quantity: Joi.number().positive().required(),
          size: Joi.string().required(),
          color: Joi.string().required(),
        }).required()
      ).single().min(1),
    }),
    patch: Joi.object().keys({
      uniqueCartKey: Joi.string().required(),
      quantity: Joi.number().integer().min(0).required(),
    }),
  },
};
