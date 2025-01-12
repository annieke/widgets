import { Trade } from '@uniswap/router-sdk'
import { Currency, Token, TradeType } from '@uniswap/sdk-core'

export enum TradeState {
  LOADING,
  INVALID,
  NO_ROUTE_FOUND,
  VALID,
  SYNCING,
}

// from https://github.com/Uniswap/routing-api/blob/main/lib/handlers/schema.ts

export type TokenInRoute = Pick<Token, 'address' | 'chainId' | 'symbol' | 'decimals'>

export type V3PoolInRoute = {
  type: 'v3-pool'
  tokenIn: TokenInRoute
  tokenOut: TokenInRoute
  sqrtRatioX96: string
  liquidity: string
  tickCurrent: string
  fee: string
  amountIn?: string
  amountOut?: string

  // not used in the interface
  address?: string
}

export type V2Reserve = {
  token: TokenInRoute
  quotient: string
}

export type V2PoolInRoute = {
  type: 'v2-pool'
  tokenIn: TokenInRoute
  tokenOut: TokenInRoute
  reserve0: V2Reserve
  reserve1: V2Reserve
  amountIn?: string
  amountOut?: string

  // not used in the interface
  // avoid returning it from the client-side smart-order-router
  address?: string
}

export interface GetQuoteResult {
  quoteId?: string
  blockNumber: string
  amount: string
  amountDecimals: string
  gasPriceWei: string
  gasUseEstimate: string
  gasUseEstimateQuote: string
  gasUseEstimateQuoteDecimals: string
  gasUseEstimateUSD: string
  methodParameters?: { calldata: string; value: string }
  quote: string
  quoteDecimals: string
  quoteGasAdjusted: string
  quoteGasAdjustedDecimals: string
  route: Array<V3PoolInRoute[] | V2PoolInRoute[]>
  routeString: string
}

export class InterfaceTrade extends Trade<Currency, Currency, TradeType> {}
