import { Console } from "windicss/utils";

const API_URL = import.meta.env.VITE_API_HOST; 
function setAccessToken(token) {
  localStorage.setItem('token', token)
}
function getAccessToken() {
  return localStorage.getItem('token')
}

function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user))
}
function getUser() {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}

async function updateUser(currentPassword, newPassword, fullname) {
  const userID = getUser()._id;
  console.log('Starting user update request with:', {
    userID,
    currentPassword,
    newPassword,
    fullname
  })
  
  try {
    const token = getAccessToken()
    console.log('Preparing request with:', {
      endpoint: `${API_URL}/users/${userID}`,
      method: 'PUT',
      token,
      requestBody: {
        currentPassword,
        newPassword,
        fullname
      }
    })

    const response = await fetch(`${API_URL}/users/${userID}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        fullname
      })
    });

    console.log('Received response:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    })

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Response not OK:', {
        errorData,
        requestBody: {
          currentPassword,
          newPassword,
          fullname
        }
      })
      throw new Error(errorData.message || 'Failed to update user');
    }

    const result = await response.json();
    console.log('Update successful, complete result:', result)
    return result;
    
  } catch (error) {
    console.error("Error in updateUser:", {
      error,
      requestData: {
        userID,
        currentPassword,
        newPassword,
        fullname
      }
    });
    throw error;
  }
}


async function registerUser({fullname, email, password}) {
  const resp = await fetch(API_URL+"/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({fullname, email, password}),
  })
  return await resp.json()
}

async function loginUser({email, password}) {
  
  const resp = await fetch(API_URL+"/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({email, password}),
  })
  const data = await resp.json()

  if (data.accessToken) {
    setAccessToken(data.accessToken)
    await fetchUserDetails()
  }
  return data
}

function logoutUser() {
  localStorage.clear()
}

async function createUserCart(products) {
 
  const resp = await fetch(API_URL+"/carts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": getAccessToken(),
    },
    body: JSON.stringify(products.length ? {products}: {}),
  })
  return await resp.json()
}



async function getUserCart() {
  const userID = getUser()._id;
  const resp = await fetch(API_URL + "/carts/" + userID, {
    headers: {
      "x-access-token": getAccessToken(),
    },
  });

  const cart = await resp.json();

  if (cart.products) {
    // Map over each cart product to get the discounted price for each
    const updatedProducts = await Promise.all(cart.products.map(async (product) => {
      // Get the updated discount percentage from the API
      const discountResp = await fetch(`${API_URL}/products/discounted-price/${product.productID._id}`);
      const discountData = await discountResp.json(); // Extract the JSON data

      // Generate unique cart key for each product
      const uniqueCartKey = `${product.productID._id}-${product.size}-${product.color}`;
      //console.log( discountData.discountPercentage)
      // Return updated product with the discount percentage
      return {
        id: product.productID._id,
        title: product.productID.title,
        price: product.productID.price,  // Original price of the product
        discountPercentage: discountData.discountPercentage, // Updated discount percentage from the API
        image: product.productID.images ? product.productID.images[0] : null,
        quantity: product.quantity,
        color: product.color,
        size: product.size,
        uniqueCartKey,
      };
    }));

    cart.products = updatedProducts;
  }
  else 
  {
    cart.products=window.localStorage.getItem("cart")
  }
  
  return cart;
}


async function addProductsToCart(products) {
  //console.log(products)
	const userID = getUser()?._id; // Safely access _id
	
	const resp = await fetch(API_URL + "/carts/" + userID, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			"x-access-token": getAccessToken(),
		},
		body: JSON.stringify({ products }),
	});

	// Debug: Log the response status and body
	const responseBody = await resp.json();
	
	if (!resp.ok) {
		console.error('Error adding products to cart:', responseBody);
		throw new Error(responseBody.message || 'Failed to add products to cart');
	}

	return responseBody; // Return the parsed response
}

async function removeProductFromCart(uniqueCartKey) {
 return await patchCart(uniqueCartKey, 0);
}

async function patchCart(uniqueCartKey, quantity) {
  const userID = getUser()._id;
 
  const resp = await fetch(API_URL + "/carts/" + userID, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-access-token": getAccessToken(),
    },
    body: JSON.stringify({ uniqueCartKey, quantity }),
  });

  const result = await resp.json();
  return result;
}

async function clearCart() {
  const resp = await fetch(API_URL+"/carts/clear", {
    method: "POST",
    headers: {
      "x-access-token": getAccessToken(),
    },
  })
  return await resp.json()
}

async function fetchUserDetails() {
  const resp =  await fetch(API_URL+"/users/me", {
    headers: {
      "x-access-token": getAccessToken(),
    }
  })
  const {status, user} = await resp.json()
  if (status == "ok") {
    if (!user.avatarSrc) {
      user.avatarSrc = `https://avatars.dicebear.com/api/initials/${user.fullname}.svg`
    }
    setUser(user)
    return {status, user}
  }
  else{
    setUser(null);
  }
 
}

async function fetchProducts(category, newArrivals=false) {
  let query = `new=${newArrivals ? "true" : "false"}${category ? "&category="+category : ""}`
  const resp = await fetch(API_URL+"/products?"+query)
  return await resp.json()
}
async function fetchProduct(id) {
  const resp = await fetch(API_URL+"/products/"+id)
  return await resp.json()
}

async function proceedCheckout() {
  const resp = await fetch(API_URL+"/checkout/payment", {
    headers: {
      "Content-Type": "application/json",
      "x-access-token": getAccessToken(),
    },
  })
  return await resp.json()
}

// on production create the order using stripe webhooks
async function createOrder(firstName, lastName, products, amount, contact, address) {
  let user = getUser();
  //console.log(user)
  // If user is undefined, set it to null
  if (typeof user === "undefined") {
    user = null;
  }

  // Now safely access user._id
  const userID = user ? user._id : null;

  try {
    // Log the order details before sending the request
    

    const resp = await fetch(API_URL + "/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": getAccessToken(),
      },
      body: JSON.stringify({
        userID, // Send userID as null if there is no user
        firstName,
        lastName,
        products: products.map((product) => ({
          productID: product.id,
          title: product.title,
          SCQ: `${product.size}-${product.color}-${product.quantity}`, // Concatenate size, color, and quantity
        })),
        amount,
        contact,
        address,
      }),
    });

    // Check if the response status is ok (2xx), else log the status code
    if (!resp.ok) {
      const errorText = await resp.text(); // Get the response body as text for logging
      console.error(`Error: Received status code ${resp.status}. Response: ${errorText}`);
      throw new Error(`HTTP error! status: ${resp.status}`);
    }

    const data = await resp.json();

    // Log the successful response
    //console.log("Order created successfully:", data);

    return data;
  } catch (error) {
    // Log error details with more context
    console.error("Error while creating order:", error);

    // Optionally, if you want to log specific error details for debugging:
    if (error.response) {
      console.error("Backend error response:", error.response);
    } else {
      console.error("General error:", error.message);
    }

    throw error;
  }
}


async function fetchAllOrders() {
  const userID = getUser()._id
  const resp = await fetch(API_URL+"/orders/user/"+userID, {
    headers: {
      "x-access-token": getAccessToken(),
    }
  })
  //console.log("backendresp",resp)
  return await resp.json()
}
async function checkProductQuantity(uniqueCartKey) {
  const accessToken = getAccessToken();  // Assume this function exists to retrieve access token
  
  try {
    const response = await fetch(`${API_URL}/products/checkQuantity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": accessToken
      },
      body: JSON.stringify({
        uniqueCartKey: uniqueCartKey
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking product quantity:", error);
    throw error;
  }
}

// Update product quantity with a single parameter 'id-scq'
async function updateProductQuantity(productIds) {
  const accessToken = getAccessToken();  // Get the access token for authorization
  //console.log("api para",productIds)
  // Map the productIds array to the format id-size-color-quantity
  const productDetails = productIds.join(",")// Join them with a comma to form the final string
  //console.log("product apiii", productDetails)
  const response = await fetch(`${API_URL}/products/update-quantity`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",  // Content type is JSON
      "x-access-token": accessToken,  // Authorization token
    },
    body: JSON.stringify({ productDetails }),  // Send the formatted string
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to update product quantity: ${errorData.message}`);
  }

  return await response.json();  // Return the response as JSON
}


async function fetchOrderDetails(orderID) {
  const resp = await fetch(API_URL+"/orders/"+orderID, {
    headers: {
      "x-access-token": getAccessToken(),
    }
  })
  return await resp.json()
}

export default {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  fetchUserDetails,
  fetchProducts,
  fetchProduct,
  createUserCart,
  getUserCart,
  addProductsToCart,
  removeProductFromCart,
  patchCart,
  clearCart,
  proceedCheckout,
  createOrder,
  fetchAllOrders,
  fetchOrderDetails,
  updateProductQuantity,
  checkProductQuantity,
  updateUser,
}
