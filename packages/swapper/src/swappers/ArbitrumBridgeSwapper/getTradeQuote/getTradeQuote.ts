import { ethChainId } from '@shapeshiftoss/caip'
import { type HDWallet, supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInput,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { fetchArbitrumBridgeSwap } from '../utils/fetchArbitrumBridgeSwap'
import { assertValidTrade } from '../utils/helpers'

export type GetEvmTradeQuoteInputWithWallet = Omit<GetEvmTradeQuoteInput, 'supportsEIP1559'> & {
  wallet: HDWallet
}

type ArbitrumBridgeSpecificMetadata = {
  direction: 'deposit' | 'withdrawal'
}

export type ArbitrumBridgeTradeQuote = TradeQuote & ArbitrumBridgeSpecificMetadata

export const isArbitrumBridgeTradeQuote = (
  quote: TradeQuote | undefined,
): quote is ArbitrumBridgeTradeQuote => !!quote && 'direction' in quote

export const getTradeQuoteWithWallet = async (
  inputWithWallet: GetEvmTradeQuoteInputWithWallet,
  deps: SwapperDeps,
) => {
  const { wallet, ...input } = inputWithWallet
  const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

  return getTradeQuote(
    {
      ...input,
      sellAsset: input.sellAsset,
      buyAsset: input.buyAsset,
      accountNumber: input.accountNumber,
      supportsEIP1559,
    },
    deps,
  )
}

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
  { assertGetEvmChainAdapter, getEthersV5Provider }: SwapperDeps,
): Promise<Result<ArbitrumBridgeTradeQuote, SwapErrorRight>> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    accountNumber,
    supportsEIP1559,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
  } = input

  const assertion = await assertValidTrade({ buyAsset, sellAsset, getEthersV5Provider })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const isDeposit = sellAsset.chainId === ethChainId

  // 15 minutes for deposits, 7 days for withdrawals
  const estimatedExecutionTimeMs = isDeposit ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000

  // 1/1 when bridging on Arbitrum bridge
  const rate = '1'

  try {
    const swap = await fetchArbitrumBridgeSwap({
      supportsEIP1559,
      chainId,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset,
      sendAddress: sendAddress ?? '',
      receiveAddress,
      assertGetEvmChainAdapter,
      getEthersV5Provider,
    })

    const buyAmountBeforeFeesCryptoBaseUnit = sellAmountIncludingProtocolFeesCryptoBaseUnit
    const buyAmountAfterFeesCryptoBaseUnit = sellAmountIncludingProtocolFeesCryptoBaseUnit

    return Ok({
      id: uuid(),
      receiveAddress,
      affiliateBps: '0',
      potentialAffiliateBps: '0',
      rate,
      slippageTolerancePercentageDecimal: getDefaultSlippageDecimalPercentageForSwapper(
        SwapperName.ArbitrumBridge,
      ),
      steps: [
        {
          estimatedExecutionTimeMs,
          allowanceContract: swap.allowanceContract,
          rate,
          buyAsset,
          sellAsset,
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            protocolFees: {},
            networkFeeCryptoBaseUnit: swap.networkFeeCryptoBaseUnit,
          },
          source: SwapperName.ArbitrumBridge,
        },
      ] as SingleHopTradeQuoteSteps,
      direction: isDeposit ? ('deposit' as const) : ('withdrawal' as const),
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[ArbitrumBridge: tradeQuote] - failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}
