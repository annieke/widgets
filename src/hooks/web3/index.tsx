import { JsonRpcProvider } from '@ethersproject/providers'
import { initializeConnector, Web3ReactHooks, Web3ReactProvider } from '@web3-react/core'
import { EIP1193 } from '@web3-react/eip1193'
import { MetaMask } from '@web3-react/metamask'
import { Network } from '@web3-react/network'
import { Connector, Provider as Eip1193Provider } from '@web3-react/types'
import { SupportedChainId } from 'constants/chains'
import { PropsWithChildren, useEffect, useMemo, useRef } from 'react'
import JsonRpcConnector from 'utils/JsonRpcConnector'
import { WalletConnectPopup, WalletConnectQR } from 'utils/WalletConnect'

import { Provider as ConnectorsProvider } from './useConnectors'
import {
  JsonRpcConnectionMap,
  Provider as JsonRpcUrlMapProvider,
  toJsonRpcConnectionMap,
  toJsonRpcUrlMap,
} from './useJsonRpcUrlsMap'

type Web3ReactConnector<T extends Connector = Connector> = [T, Web3ReactHooks]

interface Web3ReactConnectors {
  user: Web3ReactConnector<EIP1193 | JsonRpcConnector> | undefined
  metaMask: Web3ReactConnector<MetaMask>
  walletConnect: Web3ReactConnector<WalletConnectPopup>
  walletConnectQR: Web3ReactConnector<WalletConnectQR>
  network: Web3ReactConnector<Network>
}

interface ProviderProps {
  provider?: Eip1193Provider | JsonRpcProvider
  jsonRpcMap?: JsonRpcConnectionMap
  defaultChainId?: SupportedChainId
}

export function Provider({
  defaultChainId = SupportedChainId.MAINNET,
  jsonRpcMap,
  provider,
  children,
}: PropsWithChildren<ProviderProps>) {
  const web3ReactConnectors = useWeb3ReactConnectors({ provider, jsonRpcMap, defaultChainId })

  const key = useRef(0)
  const prioritizedConnectors = useMemo(() => {
    // Re-key Web3ReactProvider before rendering new connectors, as it expects connectors to be
    // referentially static.
    key.current += 1

    const prioritizedConnectors: (Web3ReactConnector | undefined)[] = [
      web3ReactConnectors.user,
      web3ReactConnectors.metaMask,
      web3ReactConnectors.walletConnect,
      web3ReactConnectors.walletConnectQR,
      web3ReactConnectors.network,
    ]
    return prioritizedConnectors.filter((connector): connector is Web3ReactConnector => Boolean(connector))
  }, [web3ReactConnectors])

  const connectors = useMemo(
    () => ({
      user: web3ReactConnectors.user?.[0],
      metaMask: web3ReactConnectors.metaMask[0],
      walletConnect: web3ReactConnectors.walletConnect[0],
      walletConnectQR: web3ReactConnectors.walletConnectQR[0],
      network: web3ReactConnectors.network[0],
    }),
    [web3ReactConnectors]
  )

  // Attempt to connect eagerly if there is no user-provided provider.
  useEffect(() => {
    // Ignore any errors during connection so they do not propagate to the widget.
    if (connectors.user) {
      connectors.user.activate().catch(() => undefined)
      return
    }
    const eagerConnectors = [connectors.metaMask, connectors.walletConnect]
    eagerConnectors.forEach((connector) => connector.connectEagerly().catch(() => undefined))
    connectors.network.activate().catch(() => undefined)
  }, [connectors.metaMask, connectors.network, connectors.user, connectors.walletConnect])

  return (
    <Web3ReactProvider connectors={prioritizedConnectors} key={key.current}>
      <JsonRpcUrlMapProvider jsonRpcMap={jsonRpcMap}>
        <ConnectorsProvider connectors={connectors}>{children}</ConnectorsProvider>
      </JsonRpcUrlMapProvider>
    </Web3ReactProvider>
  )
}

const onError = (error: Error) => console.error(error)

function initializeWeb3ReactConnector<T extends Connector, P extends object>(
  Constructor: { new (options: P): T },
  options?: Omit<P, 'actions'>
): Web3ReactConnector<T> {
  const [connector, hooks] = initializeConnector((actions) => new Constructor({ actions, onError, ...options } as P))
  return [connector, hooks]
}

function useWeb3ReactConnectors({ defaultChainId, provider, jsonRpcMap }: ProviderProps) {
  const [urlMap, connectionMap] = useMemo(
    () => [toJsonRpcUrlMap(jsonRpcMap), toJsonRpcConnectionMap(jsonRpcMap)],
    [jsonRpcMap]
  )

  const user = useMemo(() => {
    if (!provider) return
    if (JsonRpcProvider.isProvider(provider)) {
      return initializeWeb3ReactConnector(JsonRpcConnector, { provider })
    } else if (JsonRpcProvider.isProvider((provider as any).provider)) {
      throw new Error('Eip1193Bridge is experimental: pass your ethers Provider directly')
    } else {
      return initializeWeb3ReactConnector(EIP1193, { provider })
    }
  }, [provider])
  const metaMask = useMemo(() => initializeWeb3ReactConnector(MetaMask), [])
  const walletConnect = useMemo(
    () => initializeWeb3ReactConnector(WalletConnectPopup, { options: { rpc: urlMap }, defaultChainId }),
    [defaultChainId, urlMap]
  )
  const walletConnectQR = useMemo(
    () => initializeWeb3ReactConnector(WalletConnectQR, { options: { rpc: urlMap }, defaultChainId }),
    [defaultChainId, urlMap]
  )
  const network = useMemo(
    () => initializeWeb3ReactConnector(Network, { urlMap: connectionMap, defaultChainId }),
    [connectionMap, defaultChainId]
  )

  return useMemo<Web3ReactConnectors>(
    () => ({
      user,
      metaMask,
      walletConnect,
      walletConnectQR,
      network,
    }),
    [metaMask, network, user, walletConnect, walletConnectQR]
  )
}
