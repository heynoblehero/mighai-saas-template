import React from 'react'
import '../styles/globals.css'
// Import fetch configuration to ensure cookies are always sent with requests
import '../lib/fetch-config'

export default function App({ Component, pageProps }) {
  return React.createElement(Component, pageProps)
}