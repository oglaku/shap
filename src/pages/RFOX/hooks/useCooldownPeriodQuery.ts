import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { arbitrum } from 'viem/chains'
import { useReadContract } from 'wagmi'
import { formatSecondsToDuration } from 'lib/utils/time'

export const useCooldownPeriodQuery = () => {
  const cooldownPeriodQuery = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'cooldownPeriod',
    chainId: arbitrum.id,
    query: {
      staleTime: Infinity,
      select: data => formatSecondsToDuration(Number(data)),
    },
  })

  return cooldownPeriodQuery
}
