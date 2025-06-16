import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'virtual:windi.css'
import App from './App'

// Get the root element
const container = document.getElementById('root')

// Create a root
const root = createRoot(container)

// Render your app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)