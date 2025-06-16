const jwt = require("jsonwebtoken")
require('dotenv').config();

const verifyToken = (req, res, next) => {
	const token = req.headers["x-access-token"]
    const JWT_SECRET="AHMED123"
	if (token) {
		jwt.verify(token, JWT_SECRET, (err, user) => {
			if (err) {
				return res.status(403).json({
					status: "error",
					message: "access token is invalid",
				})
			}
			req.user = user
			next()
		})
	} else {
		return res.status(401).json({
			status: "error",
			message: "access token not found",
		})
	}
}

const verifyAuthorization = (req, res, next) => {
	verifyToken(req, res, () => {
		if (req.user.uid === req.params.id || req.user.isAdmin) next()
		else {
			res.status(403).json({
				status: "error",
				message: "you are not authorized to perform this action",
			})
		}
	})
}

const verifyAdminAccess = (req, res, next) => {
	verifyToken(req, res, () => {
		if (req.user.isAdmin) next()
		else {
			res.status(403).json({
				status: "error",
				message: "you are not authorized to perform this action",
			})
		}
	})
}

module.exports = { 
	verifyToken,
	verifyAuthorization,
	verifyAdminAccess,
}
