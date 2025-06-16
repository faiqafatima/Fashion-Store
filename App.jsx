import { createContext, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ScrollToTop from "@/ScrollToTop"

import HomePage from "@/pages/HomePage"
import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
import NotFoundPage from "@/pages/404Page"
import ProductsPage from "@/pages/ProductsPage"
import ProductDetailsPage from "@/pages/ProductDetailsPage"
import CartPage from "@/pages/CartPage"
import CheckOutPage from "@/pages/CheckOutPage"
import OrdersPage from "@/pages/OrdersPage"
import OrderDetailsPage from "@/pages/OrderDetailsPage"
import AccountPage from "@/pages/AccountPage"
import api from '@/api'
import cartReducer, { initialCartState } from '@/reducers/cartReducer'
import useReducerWithLocalStorage from '@/hooks/useReducerWithLocalStorage'
import UserLayout from './layouts/UserLayout'

export const UserContext = createContext()
export const CartContext = createContext()

export default function App() {
  const [user, setUser] = useState(null)
  const [cart, cartDispatch] = useReducerWithLocalStorage(cartReducer, initialCartState, "cart")
  
  useEffect(() => {
    (async () => {
      const resp = await api.fetchUserDetails()
      if (resp.status == "ok") {
        setUser(resp.user)
      }
    })()
  }, [])

  useEffect(() => {
    if (!user) return
    (async () => {
      const resp = await api.getUserCart()
      if (resp.products) {
        cartDispatch({type: "SET_PRODUCTS", payload: resp.products})
      }
    })()
  }, [user])

  return (
    <BrowserRouter>      
      <CartContext.Provider value={{cart, cartDispatch}}>
      <UserContext.Provider value={{user, setUser}}>
        <ScrollToTop />
        
        <Routes>
          <Route path="/" element={<UserLayout />}>
            <Route index element={<HomePage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckOutPage/>} />

            <Route path="login" element={user ? <Navigate replace to="/" /> : <LoginPage />} />
            <Route path="register" element={user ? <Navigate replace to="/" /> : <RegisterPage />} />
            <Route path="account" element={user ? <AccountPage /> : <Navigate replace to="/login" />} />

              <Route path="products" element={<ProductsPage />} />
              <Route path="products/:gender" element={<ProductsPage />} />
              <Route path="products/:gender/:category" element={<ProductsPage />} />\
              <Route path="discount" element={<ProductsPage />} />
              <Route path="discount/:gender" element={<ProductsPage />} />
              <Route path="discount/:gender/:category" element={<ProductsPage />} />
              {/* <Route path="products" element={<ProductsPage />} />
              <Route path="products/men" element={<ProductsPage gender="men" />} />
              <Route path="products/men/t-shirts" element={<ProductsPage gender="men" categoryy="t-shirts" />} />
              <Route path="products/men/jeans" element={<ProductsPage gender="men" categoryy="jeans" />} />
              <Route path="products/women" element={<ProductsPage gender="women" />} /> 
              <Route path="products/women/jeans" element={<ProductsPage gender="women" categoryy="jeans"/>} />
              <Route path="products/women/t-shirts" element={<ProductsPage gender="women" categoryy="t-shirts"/>} /> */}
              <Route path="product/:id" element={<ProductDetailsPage />} />
            
            
            <Route path="orders">
              <Route index element={user ? <OrdersPage /> : <Navigate replace to="/login" />} />
              <Route path=":id" element={user ? <OrderDetailsPage /> : <Navigate replace to="/login" />} />
            </Route>
          </Route>
            
          <Route path="*" element={<NotFoundPage />} />
        </Routes>

      </UserContext.Provider>
      </CartContext.Provider>
    </BrowserRouter>
  );
}