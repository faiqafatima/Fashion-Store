const router = require("express").Router();
const { celebrate } = require('celebrate');
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const cloudinary = require("cloudinary").v2;
const Product = require("../models/Product.model");
const { product: productSchema } = require('../models/schema');
const { 
	verifyToken,
	verifyAuthorization,
	verifyAdminAccess,
} = require('../middlewares/verifyAuth');


cloudinary.config({
    cloud_name: "du2gbassh",
    api_key: "928127957863295",
    api_secret: "2QWRcZyq10huyNQPJ6iGdlji0NU",
});

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only images are allowed"), false);
        }
    },
});
// Route for adding products with Cloudinary image upload
router.post(
    "/addProducts",
    upload.array("images", 5), // Max 5 images
    celebrate({ body: productSchema.new }),
    async (req, res) => {
        try {
            // Parse and validate product data
            const productData = {
                ...req.body,
                size: req.body.size ? JSON.parse(req.body.size) : [],
                color: req.body.color ? JSON.parse(req.body.color) : [],
                inStock: req.body.inStock === "true",
            };

            // Array to hold uploaded image URLs and their public_ids
            const imageUrls = [];
            const imagePublicIds = [];

            // Save product to database first to get the productId
            const newProduct = new Product(productData);
            const savedProduct = await newProduct.save();

            // Upload each file to Cloudinary with productId as part of the public_id
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const result = await new Promise((resolve, reject) => {
                        const uploadStream = cloudinary.uploader.upload_stream(
                            {
                                folder: "products", // Cloudinary folder name
                                public_id: `product_${savedProduct._id}_${Date.now()}`, // Unique public_id
                                resource_type: "image",
                            },
                            (error, result) => {
                                if (error) reject(error);
                                else resolve(result);
                            }
                        );
                        uploadStream.end(file.buffer);
                    });

                    // Add Cloudinary URL and public_id to the lists
                    imageUrls.push(result.secure_url);
                    imagePublicIds.push(result.public_id);
                }
            }

            // Save image URLs and public_ids to the product data
            savedProduct.images = imageUrls;
            savedProduct.imagePublicIds = imagePublicIds;
            await savedProduct.save();

            return res.status(201).json({
                status: "success",
                data: savedProduct,
            });
        } catch (error) {
            console.error("Error adding product:", error.message);
            return res.status(500).json({ message: "An error occurred while adding the product" });
        }
    }
);

router.post("/checkQuantity", async (req, res) => {
    try {
        const { uniqueCartKey } = req.body;

        // Extract id, size, and color from uniqueCartKey
        const [id, size, color] = uniqueCartKey.split("-");
        //console.log("Product ID:", id);
        //console.log("Size:", size);
        //console.log("Color:", color);

        // Check if the id is valid
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid product ID format' });
        }

        // Find the product by id
        const product = await Product.findOne({ _id: id });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Construct the search key to match `SCQ`
        const sizeColorKey = `${size}-${color}`;

        // Find the matching entry in the `SCQ` array
        const matchingItem = product.SCQ.find(scq => scq.startsWith(sizeColorKey));

        if (matchingItem) {
            // If found, extract the quantity (format: size-color-quantity)
            const [scqSize, scqColor, quantity] = matchingItem.split("-");
            return res.json({ quantity });
        } else {
            return res.status(404).json({ message: 'Size-color combination not found' });
        }

    } catch (err) {
        console.error('Error checking quantity:', err);
        return res.status(500).json({ message: 'Unexpected server error' });
    }
});


// Route for handling discount-related requests
router.get("/discount/:gender?/:category?", async (req, res) => {
    const { gender, category } = req.params;
    try {
        // Base query to get products with discount
        let query = { discountPercentage: { $gt: 0 } };

        // If gender is specified, add it to the query
        if (gender && gender !== 'all') {
            query.gender = gender.toLowerCase();
        }

        // If category is specified, add i to the query
        if (category) {
            query.category = category
        }


        //console.log('Discount Query:', query); // For debugging

        const products = await Product.find(query);

        // If no products found, return appropriate message
        if (products.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No discounted products found for the specified criteria"
            });
        }

        // Return the filtered products
        return res.status(200).json({
            status: "success",
            count: products.length,
            data: products
        });

    } catch (error) {
        console.error("Error fetching discounted products:", error);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch discounted products"
        });
    }
});
// Route for filtering products by gender and category
router.get("/api/:gender?/:category?", async (req, res) => {
	const { gender, category } = req.params;
	try {
		const query = {};
  
		if (gender) {
			query.gender = gender.toLowerCase();
		}
  
		if (category) {
			query.category = category
		}

		const products = await Product.find(query);
		res.status(200).json(products);
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Failed to fetch products" });
	}
});
router.put("/update-quantity", async (req, res) => {
    const { productDetails } = req.body; // Expecting a string with the format id-size-color-quantity, separated by commas
    //console.log("body",productDetails);
    
    if (!productDetails) {
        return res.status(400).json({ message: "Product details string is missing" });
    }

    // Split the string into individual id-size-color-quantity sets
    const productsArray = productDetails.split(",");

    // Process each id-size-color-quantity string
    try {
        for (const productDetail of productsArray) {
            const parts = productDetail.split("-");  // Define parts here
            if (parts.length !== 4) {
                return res.status(400).json({ message: `Invalid format for ${productDetail}, expected id-size-color-quantity` });
            }

            const [productId, size, color, quantity] = parts;

            // Ensure that quantity is a number and greater than 0
            if (isNaN(quantity) || quantity <= 0) {
                return res.status(400).json({ message: `Quantity must be a positive number for ${productDetail}` });
            }

            // Find the product by its ID
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: `Product with id ${productId} not found` });
            }

            // Find the SCQ string that matches the size and color
            const scqIndex = product.SCQ.findIndex((scq) => {
                const [scqSize, scqColor] = scq.split("-");  // Split again for SCQ size and color
                return scqSize === size && scqColor === color;
            });

            if (scqIndex === -1) {
                return res.status(404).json({ message: `Size and color combination not found for product ${productId}` });
            }

            // Update the quantity in the matched SCQ string
            const [scqSize, scqColor, scqQuantity] = product.SCQ[scqIndex].split("-");
            const updatedQuantity = parseInt(scqQuantity) - parseInt(quantity);

            // Ensure the updated quantity is not negative
            if (updatedQuantity < 0) {
                return res.status(400).json({ message: `Insufficient stock for ${productId} with size ${size} and color ${color}` });
            }

            product.SCQ[scqIndex] = `${scqSize}-${scqColor}-${updatedQuantity}`;
            await product.save();
        }

        // Respond with success once all updates are completed
        return res.status(200).json({
            status: "success",
            message: "Product quantities updated successfully",
        });

    } catch (error) {
        console.error("Error updating product quantities:", error);
        return res.status(500).json({ message: "An unexpected error occurred" });
    }
});


// Route for fetching a specific product by ID
router.get("/:id", async (req, res) => {
	const { id } = req.params;
  
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ message: "Invalid product ID format" });
	}
  
	try {
		const product = await Product.findById(id);
		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}
		return res.json(product);
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: "Unexpected error occurred" });
	}
});

// Route to fetch discounted price for a specific product
router.get("/discounted-price/:id", async (req, res) => {
    const { id } = req.params;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID format" });
    }

    try {
        // Fetch the product by ID
        const product = await Product.findById(id);

        // If the product doesn't exist, return an error
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Ensure the product has a valid price and discountPercentage
        if (!product.price || product.discountPercentage == null) {
            return res.status(400).json({ message: "Price or discount information is missing" });
        }

        // Return only the discount percentage
        return res.status(200).json({
            discountPercentage: product.discountPercentage
        });
    } catch (error) {
        console.error("Error fetching discounted price:", error);
        return res.status(500).json({ message: "Unexpected error occurred" });
    }
});

// Add a new product - admin only
router.post("", 
	verifyAdminAccess, 
	celebrate({ body: productSchema.new }),
	async (req, res) => {
		try {
			//console.log('=== New Product Addition (Admin) ===');
			//console.log('Product Data:', req.body);
			
			const newProduct = await Product.create(req.body);
			//console.log('Product successfully added to database');
			return res.json(productResponse.productAdded);

		} catch (err) {
			console.error('Error adding product:', err);
			return res.status(500).json(productResponse.unexpectedError);
		}
	}
);
// Route for fetching subcategories of men and women
// Route for fetching subcategories of men and women with detailed logs
router.get("/apii/productssubcategories", async (req, res) => {
    try {
        // Fetch products with gender "men" or "women"
        const products = await Product.find({
            gender: { $in: ["men", "women"] }
        });

        // Collect unique categories for men and women
        const categories = {
            men: [],
            women: []
        };

        products.forEach(product => {
            if (product.gender === "men" && product.category && !categories.men.includes(product.category)) {
                categories.men.push(product.category);
            }
            if (product.gender === "women" && product.category && !categories.women.includes(product.category)) {
                categories.women.push(product.category);
            }
        });

        // Return the categories
        return res.status(200).json(categories);
    } catch (error) {
        return res.status(500).json({ message: "Unexpected error occurred" });
    }
});
// Route for fetching products with discounts grouped by subcategory
// Route for fetching products with discounts grouped by subcategory
router.get("/apiii/discounted-products", async (req, res) => {
    try {
        // Fetch products with a discountPercentage greater than 0
        const discountedProducts = await Product.find({ discountPercentage: { $gt: 0 } });

        // Collect unique categories for men and women
        const subcategories = {
            men: [],
            women: []
        };

        discountedProducts.forEach(product => {
            if (product.gender && product.category) {
                if (product.gender === "men" && !subcategories.men.includes(product.category)) {
                    subcategories.men.push(product.category);
                }
                if (product.gender === "women" && !subcategories.women.includes(product.category)) {
                    subcategories.women.push(product.category);
                }
            }
        });

        // Return the grouped subcategories
        return res.status(200).json(subcategories);
    } catch (error) {
        console.error("Error fetching discounted products:", error);
        return res.status(500).json({ message: "Unexpected error occurred" });
    }
});



// Update a product - admin only
// Update a product - admin only
router.put("/:id",  async (req, res) => {
    const { id } = req.params;
    
    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID format" });
    }

    try {
        // Find the product by ID and update it with the new data sent in the body
        const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });

        // If the product wasn't found, return an error
        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Return the updated product details
        return res.json({
            status: "ok",
            message: "Product has been updated",
            data: updatedProduct
        });

    } catch (err) {
        console.error("Error updating product:", err);
        return res.status(500).json({ message: "Unexpected error occurred" });
    }
});

async function deleteProductImagesFromCloudinary(imageUrls) {
    for (const url of imageUrls) {
        try {
            // Extract the public ID from the URL
            const parts = url.split("/upload/"); // Split at '/upload/'
            if (parts.length < 2) {
                console.error(`Invalid Cloudinary URL format: ${url}`);
                continue; // Skip invalid URLs
            }

            // Extract the part after '/upload/' and remove the version and file extension
            const publicIdWithExtension = parts[1]; // Everything after "/upload/"
            const publicId = publicIdWithExtension.replace(/^v\d+\//, "").split(".")[0]; // Remove version and file extension

            // Log the public ID for debugging
            console.log(`Public ID being used: ${publicId}`);

            // Delete image from Cloudinary
            const result = await cloudinary.uploader.destroy(publicId);
            console.log(`Deleted: ${publicId}`, result);

        } catch (error) {
            console.error(`Failed to delete image from URL: ${url}`, error.message);
        }
    }
}


router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product ID format" });
    }

    try {
        // Directly attempt to delete the product and its images
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Assuming 'product.images' contains an array of URLs, pass them to the image deletion function
        if (product.images && product.images.length > 0) {
            await deleteProductImagesFromCloudinary(product.images);
            return;
        }

        // Now delete the product from the database
        await Product.findByIdAndDelete(id);

        return res.json(productResponse.productDeleted);
    } catch (err) {
        console.error("Error deleting product:", err);
        return res.status(500).json(productResponse.unexpectedError);
    }
});

const productResponse = {
	productAdded: { 
		status: "ok",
		message: "product has been added",
	},	
	productUpdated: { 
		status: "ok",
		message: "product has been updated",
	},
	productDeleted: { 
		status: "ok",
		message: "product has been deleted",
	},
	unexpectedError: {
		status: "error",
		message: "an unexpected error occurred",
	},
};

module.exports = router;
