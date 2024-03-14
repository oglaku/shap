import { Avatar } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { generatePath, useHistory } from 'react-router-dom'
import { AccountsIcon } from 'components/Icons/Accounts'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import {
  selectAccountNumberByAccountId,
  selectAssetById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EquityRow } from './EquityRow'

type EquityAccountRowProps = {
  accountId: AccountId
  assetId: AssetId
  totalFiatBalance?: string
  color?: string
}

const accountsIcon = <AccountsIcon boxSize='18px' />

export const EquityAccountRow = ({
  accountId,
  assetId,
  totalFiatBalance,
  color,
}: EquityAccountRowProps) => {
  const translate = useTranslate()
  const history = useHistory()
  const feeAssetId = accountIdToFeeAssetId(accountId)
  const rowAssetId = assetId ? assetId : feeAssetId
  const asset = useAppSelector(state => selectAssetById(state, rowAssetId ?? ''))

  const filter = useMemo(() => ({ assetId: rowAssetId, accountId }), [rowAssetId, accountId])
  const accountNumber = useAppSelector(state => selectAccountNumberByAccountId(state, filter))
  const cryptoHumanBalance = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, filter),
  )
  const userCurrencyBalance = useAppSelector(state =>
    selectPortfolioUserCurrencyBalanceByFilter(state, filter),
  )

  const path = generatePath(
    assetId ? '/wallet/accounts/:accountId/:assetId' : '/wallet/accounts/:accountId',
    filter,
  )

  const handleClick = useCallback(() => {
    history.push(path)
  }, [history, path])

  const equityRowIcon = useMemo(
    () =>
      asset ? (
        <Avatar
          bg={`${asset.color}30`}
          color={asset.color}
          size='sm'
          borderRadius='lg'
          icon={accountsIcon}
        />
      ) : null,
    [asset],
  )

  if (!(asset && equityRowIcon)) return null
  return (
    <EquityRow
      accountId={accountId}
      onClick={handleClick}
      icon={equityRowIcon}
      label={translate('accounts.accountNumber', { accountNumber })}
      totalFiatBalance={totalFiatBalance}
      color={color}
      fiatAmount={userCurrencyBalance}
      cryptoBalancePrecision={cryptoHumanBalance}
      symbol={asset.symbol}
      subText={translate('common.wallet')}
    />
  )
}
