const router = require("express").Router();
const { celebrate } = require("celebrate");
const ObjectId = require("mongoose").Types.ObjectId;

const Cart = require("../models/Cart.model");
const { cart: cartSchema } = require('../models/schema');
const { 
	verifyToken,
	verifyAuthorization,
	verifyAdminAccess,
} = require('../middlewares/verifyAuth');

// Get all carts - admin only
router.get("/", verifyAdminAccess, async (req, res) => {
	try {
		const carts = await Cart.find();
		return res.json(carts);
	} catch (err) {
		console.error(err);
		return res.status(500).json(cartResponse.unexpectedError);
	}
});

// Create a new cart - any authenticated user
router.post("/", 
	verifyToken, 
	celebrate({ body: cartSchema.new }),
	async (req, res) => {
	const { products } = req.body;

	try {
		await Cart.create({ 
			userID: ObjectId(req.user.uid),
			products,
		});
		return res.json(cartResponse.cartCreated);
	} catch (err) {
		//console.log(err);
		return res.status(500).json(cartResponse.unexpectedError);
	}
});

// Reset a cart - any authenticated user
router.post("/clear", verifyToken, async (req, res) => {
	try {
		await Cart.updateOne(
			{userID: ObjectId(req.user.uid)},
			{$set: {products: []}},
		);
		return res.json(cartResponse.cartCleared);
	} catch (err) {
		//console.log(err);
		return res.status(500).json(cartResponse.unexpectedError);
	}
});

// Get a cart - authorized user & admin only
router.get("/:id", verifyAuthorization, async (req, res) => {
	try {
		let cart = await Cart.findOne({ userID: ObjectId(req.params.id) });
		if (cart) {
			cart = await cart.populate({
				path: 'products.productID',
				select: ['title', 'price', 'images'],
			});
		}
		return res.json(cart);
	}catch (err) {
		console.error('Error while updating cart:', err.message); // Log the error message
		console.error(err.stack); // Log the stack trace to see where the error occurs
		return res.status(500).json({ message: "An unexpected error occurred.", error: err.message });
	}
	
});



router.put("/:id", async (req, res) => {
    const { products } = req.body;
    const userId = req.params.id;

    try {

        // Ensure the userID is valid
        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID.' });
        }

        // Find the cart for the given user
        let cart = await Cart.findOne({ userID: ObjectId(userId) });

        // If no cart is found, create a new one with the products
        if (!cart) {
           cart = new Cart({
                userID: ObjectId(userId),
                products: []
            });
        }

        // Flag to track if any changes were made
        let cartUpdated = false;

        // Iterate over each product in the request and update/add it in the user's cart
        for (const product of products) {
            const uniqueKey = `${product.productID}-${product.size}-${product.color}`;
            // Check if the product already exists in the cart based on unique key
            const existingProductIndex = cart.products.findIndex(
                existingProduct => existingProduct.uniqueCartKey === uniqueKey
            );

            if (existingProductIndex >= 0) {
                // If the product exists, update the quantity
                cart.products[existingProductIndex].quantity += product.quantity || 1;
                cartUpdated = true; // Mark that the cart was updated
           } else {
                // If it doesn't exist, add the new product
                const newProduct = {
                    uniqueCartKey: uniqueKey,
                    productID: product.productID,
                    size: product.size,
                    color: product.color,
                    quantity: product.quantity || 1 // Set default quantity if not provided
                };
                cart.products.push(newProduct);
                cartUpdated = true; // Mark that the cart was updated
            }
        }

        // Save the updated cart only if there are changes
        if (cartUpdated) {
            await cart.save();
           return res.status(200).json({ 
                message: 'Cart updated successfully.',
                cart  // Return the updated cart
            });
        } else {
            return res.status(200).json({ 
                message: 'No changes made to the cart.',
                cart  // Return the current cart as no changes were made
            });
        }

    } catch (err) {
        // Log the error and return a 500 error response
        console.error('Error while updating cart:', err);
        return res.status(500).json({ message: "An unexpected error occurred." });
    }
});


// Patch a cart (to update product qty or remove product) - authorized user
router.patch("/:id",
	verifyAuthorization,
	celebrate({ body: cartSchema.patch }),
	async (req, res) => {
		const { uniqueCartKey, quantity } = req.body;

		try {
			// Fetch the user's cart
			const cart = await Cart.findOne({ userID: ObjectId(req.params.id) });
			
			if (!cart) {
				return res.status(404).json({ message: 'Cart not found.' });
			}

			
			// Split the uniqueCartKey into productID, size, and color
			const [productID, size, color] = uniqueCartKey.split('-');
			
			// Log the split values
		
			// Find the product matching productID, size, and color
			const productIndex = cart.products.findIndex(product => 
				product.productID.toString() === productID &&
				product.size === size &&
				product.color === color
			);

			if (productIndex === -1) {
				return res.status(400).json({ message: 'Product not found in cart.' });
			}

			// If quantity is zero, remove the product
			if (quantity === 0) {
				cart.products.splice(productIndex, 1); // Remove the product
				await cart.save(); // Save the updated cart
				return res.json({ message: 'Product removed from the cart.' });
			} else {
				// Update the quantity
				cart.products[productIndex].quantity = quantity;
				await cart.save(); // Save the updated cart
				// Return the updated cart
			return res.json(cart);
			}
		} catch (err) {
			console.error(err);
			return res.status(500).json(cartResponse.unexpectedError);
		}
	}
);



// Delete a cart - authorized user & admin only
router.delete("/:id", verifyAuthorization, async (req, res) => {
	try {
		await Cart.deleteOne({ userID: ObjectId(req.params.id) });
		res.json(cartResponse.cartDeleted);
	} catch (err) {
		//console.log(err);
		return res.status(500).json(cartResponse.unexpectedError);
	}
});

const cartResponse = {
	cartCreated: { 
		status: "ok",
		message: "cart has been created",
	},	
	cartCleared: { 
		status: "ok",
		message: "cart has been cleared",
	},	
	cartUpdated: { 
		status: "ok",
		message: "cart has been updated",
	},
	cartPatched: {
		status: "ok",
		message: "cart has been patched",
	},
	cartDeleted: { 
		status: "ok",
		message: "cart has been deleted",
	},
	unexpectedError: {
		status: "error",
		message: "an unexpected error occurred",
	},
};

module.exports = router;