import React from 'react'
import Script from 'next/script'
import { useRouter } from 'next/router'
import '../styles/globals.css'
// Import fetch configuration to ensure cookies are always sent with requests
import '../lib/fetch-config'
import SupportWidget from '../components/SupportWidget'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const isAdminPage = router.pathname.startsWith('/admin')

  return (
    <>
      {/* Analytics Script - all pages */}
      <Script src="/analytics.js" strategy="afterInteractive" />

      {/* Heatmap and Support Widget - only on non-admin pages */}
      {!isAdminPage && <Script src="/heatmap.js" strategy="afterInteractive" />}

      {/* Main Component */}
      {React.createElement(Component, pageProps)}

      {!isAdminPage && <SupportWidget />}
    </>
  )
}