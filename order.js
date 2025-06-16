const router = require("express").Router()
const ObjectId = require('mongoose').Types.ObjectId
const { celebrate } = require('celebrate')

const Order = require("../models/Order.model")
const { order: orderSchema } = require('../models/schema')
const { 
	verifyToken,
	verifyAuthorization,
	verifyAdminAccess,
} = require('../middlewares/verifyAuth')


// Get all orders - admin only
router.get("/allorders", 
	celebrate({ query: orderSchema.query }),
	async (req, res) => {
	const query = req.query;

	try {
		let orders;
		if (query.status) {
			orders = await Order.find({ status: query.status });
		} else {
			orders = await Order.find();
		}

		return res.json(orders);

	} catch (err) {
		console.error(err);
		return res.status(500).json(orderResponse.unexpectedError);
	}
});

// Create a new order - authenticated user
// Create a new order - authenticated user
router.post("/", 
	celebrate({ body: orderSchema.new }),
	async (req, res) => {
	  const { userID, products, firstName, lastName, amount, contact, address } = req.body;
  
	  try {
		const order = await Order.create({ 
		  userID,
		  firstName,
		  lastName,
		  products,
		  amount,
		  contact,
		  address,
		});
  
		return res.json({
		  ...orderResponse.orderCreated,
		  orderID: order._id,
		});
  
	  } catch (err) {
		console.error("Error while creating order:", err);
		return res.status(500).json(orderResponse.unexpectedError);
	  }
	}
  );
  

// Get order statistics - admin only
router.get("/stats", verifyAdminAccess, async (req, res) => {
	const date = new Date()
	const lastMonth = new Date(date.setMonth(date.getMonth() - 1))
	const previousMonth = new Date(date.setMonth(lastMonth.getMonth() - 1))

	try {
		const data = await Order.aggregate([
			{$match: {
				createdAt: { $gte: previousMonth },
			}},
			{$project: {
				month: { $month: "$createdAt" },
				sales: "$amount",
			}},
			{$group: {
				_id: "$month",
				sales: { $sum: "$sales"},
			}}
		])
		res.json(data)

	} catch (err) {
		console.error(err)
		return res.status(500).json(orderResponse.unexpectedError)
	}
})

// Get an order - authorized user & admin only
router.get("/:id", verifyToken, async (req, res) => {
	// cannot use 'verifyAuthorization' due to 'id' being 'orderID' here
	try {
		let order

		// manually verify authorization
		if (req.user.isAdmin) {
			order = await Order.findById(req.params.id)
		} else {
			order = await Order.findOne({
				_id: ObjectId(req.params.id),
				userID: ObjectId(req.user.uid),
			})
		}

		if (!order) {
			return res.status(404).json(orderResponse.orderNotFound)
		} 
		order = await order.populate({
			path: "products.productID",
			select: ["title", "price", "image"],
		})
		return res.json({status: "ok", order})

	} catch (err) {
		console.error(err)
		return res.status(500).json(orderResponse.unexpectedError)
	}
})

// Update an order - admin only
router.put("/:id", 
	verifyAdminAccess, 
	celebrate({ body: orderSchema.update }),
	async (req, res) => {
	try {
		await Order.findByIdAndUpdate(
			req.params.id,
			{$set: req.body},
			{new: true},
		)
		return res.json(orderResponse.orderUpdated)
		
	} catch (err) {
		console.error(err)
		return res.status(500).json(orderResponse.unexpectedError)
	}
})

// Update order status (removed verifyAdminAccess)
router.put("/:id/status", async (req, res) => {
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'shipped', 'in transit', 'delivered', 'returned'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            status: "error",
            message: "Invalid status value"
        });
    }

    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { $set: { status: status } },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json(orderResponse.orderNotFound);
        }

        return res.json({
            status: "ok",
            message: "Order status has been updated",
            order: updatedOrder
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json(orderResponse.unexpectedError);
    }
});
// Delete an order - admin only
router.delete("/:id", verifyAdminAccess, async (req, res) => {
	try {
		await Order.findByIdAndDelete(req.params.id)
		res.json(orderResponse.orderDeleted)

	} catch (err) {
		//console.log(err)
		return res.status(500).json(orderResponse.unexpectedError)
	}
})

// Get user orders - authorized user & admin only
router.get("/user/:id", async (req, res) => {
    try {
        // Fetch all orders for the user using the userID
        const orders = await Order.find({ userID: ObjectId(req.params.id) }); 

        if (orders.length === 0) {
            return res.status(404).json({ message: "No orders found for the given user ID" });
        }

        return res.json(orders); // Return the array of orders
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Unexpected error occurred" });
    }
});

const orderResponse = {
	orderCreated: { 
		status: "ok",
		message: "order has been created",
	},	
	orderUpdated: { 
		status: "ok",
		message: "order has been updated",
	},
	orderDeleted: { 
		status: "ok",
		message: "order has been deleted",
	},
	orderNotFound: {
		status: "error",
		message: "order not found",
	},
	unexpectedError: {
		status: "error",
		message: "an unexpected error occurred",
	},
}

module.exports = router