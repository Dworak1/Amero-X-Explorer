import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import {
  getDefaultConfig,
  RainbowKitProvider,
  ConnectButton,
  darkTheme
} from '@rainbow-me/rainbowkit'
import { WagmiProvider, useAccount } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Web3 from 'web3'
// CSS is served as a static file — see app.html.eex <link> tag

function buildChainConfig() {
  const id = parseInt(document.getElementById('js-chain-id')?.value || '100', 10)
  const rpcUrl = document.getElementById('js-json-rpc')?.value || ''
  const name = document.getElementById('js-subnetwork')?.value || 'Amero X'
  const symbol = document.getElementById('js-coin-name')?.value || 'AMX'
  return {
    id,
    name,
    nativeCurrency: { name: symbol, symbol, decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
    blockExplorers: {
      default: { name: 'Amero X Scan', url: window.location.origin }
    }
  }
}

const ameroXChain = buildChainConfig()

const WALLETCONNECT_PROJECT_ID = '46c0a56cc1e7e12edf9e3e4b27c62191'

const wagmiConfig = getDefaultConfig({
  appName: 'Amero X Scan',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [ameroXChain],
  ssr: false
})

const queryClient = new QueryClient()

function WalletBridge() {
  const { address, isConnected, connector } = useAccount()

  useEffect(() => {
    if (isConnected && address && connector) {
      connector.getProvider().then((rawProvider) => {
        window.web3 = new Web3(rawProvider)
        document.dispatchEvent(new CustomEvent('rainbowkitConnected', {
          detail: { address: address.toLowerCase() }
        }))
      })
    } else {
      window.web3 = null
      document.dispatchEvent(new CustomEvent('rainbowkitDisconnected'))
    }
  }, [isConnected, address, connector])

  return null
}

const btnStyle = {
  background: '#FFFFFF',
  color: '#000000',
  border: '1.5px solid #FFFFFF',
  borderRadius: '8px',
  padding: '7px 16px',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  whiteSpace: 'nowrap',
  transition: 'background 0.2s, border-color 0.2s',
}

function WalletApp() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#E2B649',
            accentColorForeground: '#000000',
            borderRadius: 'medium'
          })}
        >
          <WalletBridge />
          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
              const connected = mounted && account && chain
              return (
                <button
                  style={btnStyle}
                  onClick={connected ? openAccountModal : openConnectModal}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F0F0F0'; e.currentTarget.style.borderColor = '#E2B649' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#FFFFFF' }}
                >
                  {connected ? (
                    <>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                      {account.displayName}
                    </>
                  ) : (
                    'Connect Wallet'
                  )}
                </button>
              )
            }}
          </ConnectButton.Custom>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export function mountWalletConnect(containerId) {
  const container = document.getElementById(containerId)
  if (!container) return
  const root = ReactDOM.createRoot(container)
  root.render(<WalletApp />)
}
