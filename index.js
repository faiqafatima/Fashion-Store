const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const cors = require('cors')
const path = require('path');

dotenv.config()
mongoose.set('strictQuery', false); // or true, based on your preference

const authRouter = require('./routes/auth') 
const userRouter = require('./routes/user') 
const productRouter = require('./routes/product') 
const cartRouter = require('./routes/cart') 
const orderRouter = require('./routes/order')
const checkoutRouter = require('./routes/checkout')
const { 
  handleMalformedJson,
  formatCelebrateErrors
} = require('./middlewares/handleError')

const app = express()

const API= process.env.MONGODB_API
// mongodb
mongoose.connect("mongodb+srv://workweb2k24:C2DmobwnMs75nbEJ@cluster0.5xrsh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useUnifiedTopology: true,
  useNewUrlParser: true
}).then(() => console.log("Connected to database"))
	.catch(err => console.error(err))


// global middlewares
app.use(cors())
app.use(express.json())
app.use(handleMalformedJson) // handle common req errors


// routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/auth", authRouter)
app.use("/users", userRouter)
app.use("/products", productRouter)
app.use("/carts", cartRouter)
app.use("/orders", orderRouter)
app.use("/checkout", checkoutRouter)

// server status
app.get("/", (req, res) => {
	res.json({status: "ok"})
})

// format celebrate paramater validation errors
app.use(formatCelebrateErrors)

app.listen(process.env.PORT || 5000, () => {
	console.log(`Listening on port ${process.env.PORT || 5000}`)
})