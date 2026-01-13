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
      {/* Analytics and Heatmap Scripts */}
      <Script src="/analytics.js" strategy="afterInteractive" />
      <Script src="/heatmap.js" strategy="afterInteractive" />

      {/* Main Component */}
      {React.createElement(Component, pageProps)}

      {/* Support Chat Widget - Only on non-admin pages */}
      {!isAdminPage && <SupportWidget />}
    </>
  )
}