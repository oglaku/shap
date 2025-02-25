import { CheckCircleIcon } from '@chakra-ui/icons'
import type { ResponsiveArray } from '@chakra-ui/react'
import {
  Button,
  Center,
  Flex,
  Grid,
  ModalBody,
  ModalHeader,
  useColorModeValue,
} from '@chakra-ui/react'
import { getConfig } from 'config'
import type { Property } from 'csstype'
import { useCallback, useMemo } from 'react'
import { isMobile } from 'react-device-detect'
import { useTranslate } from 'react-polyglot'
import { RawText, Text } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from 'lib/globals'

import { SUPPORTED_WALLETS } from './config'
import { KeyManager } from './KeyManager'
import type { WalletInfo } from './WalletProvider'

const gridTemplateColumnsProp = { base: '1fr', md: '1fr 1fr' }
const flexDirProp: ResponsiveArray<Property.FlexDirection> = ['column', 'row']
const mbProp = [3]
const mlProp = [0, 1.5]

const WalletSelectItem = ({
  walletType,
  walletInfo,
  connect,
}: {
  walletType: KeyManager
  walletInfo: WalletInfo | null
  connect: (adapter: KeyManager) => void
}) => {
  const greenColor = useColorModeValue('green.500', 'green.200')

  const option = SUPPORTED_WALLETS[walletType]
  // some wallets (e.g. keepkey) do not exist on mobile

  const isSupported = useMemo(() => {
    if (isMobileApp) {
      return ['both', 'app'].includes(String(option.supportsMobile))
    }
    if (isMobile) {
      return ['both', 'browser'].includes(String(option.supportsMobile))
    }
    // Don't display mobile supported wallets on desktop
    return option.supportsMobile !== 'app'
  }, [option.supportsMobile])

  const handleConnect = useCallback(() => connect(walletType), [connect, walletType])

  const isLedgerEnabled = useFeatureFlag('LedgerWallet')

  if (walletType === KeyManager.Ledger && !isLedgerEnabled) return null

  if (!isSupported) return null

  const isCoinbaseEnabled = getConfig().REACT_APP_FEATURE_COINBASE_WALLET
  if (walletType === KeyManager.Coinbase && !isCoinbaseEnabled) return null

  const isWalletConnectV2Enabled = getConfig().REACT_APP_FEATURE_WALLET_CONNECT_V2
  if (walletType === KeyManager.WalletConnectV2 && !isWalletConnectV2Enabled) return null

  const Icon = option.icon
  const activeWallet = walletInfo?.name === option.name
  const walletSubText = activeWallet ? 'common.connected' : null

  return (
    <Button
      key={walletType}
      w='full'
      size='md'
      py={8}
      isActive={activeWallet}
      justifyContent='space-between'
      onClick={handleConnect}
      data-test={`connect-wallet-${walletType}-button`}
    >
      <Flex alignItems='flex-start' flexDir='column'>
        <RawText fontWeight='semibold'>{option.name}</RawText>
        <Text fontSize='xs' color='text.subtle' translation={walletSubText} />
      </Flex>
      <Center width='25%'>
        {activeWallet ? (
          <CheckCircleIcon color={greenColor} />
        ) : (
          <Icon width='24px' height='auto' />
        )}
      </Center>
    </Button>
  )
}

export const SelectModal = () => {
  const {
    state: { walletInfo },
    connect,
    create,
    importWallet,
  } = useWallet()
  const translate = useTranslate()

  const wallets = useMemo(
    () => Object.values(KeyManager).filter(key => key !== KeyManager.Demo),
    [],
  )

  const handleCreate = useCallback(
    () => create(isMobileApp ? KeyManager.Mobile : KeyManager.Native),
    [create],
  )

  const handleImport = useCallback(
    () => importWallet(isMobileApp ? KeyManager.Mobile : KeyManager.Native),
    [importWallet],
  )

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.selectModal.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='text.subtle' translation={'walletProvider.selectModal.body'} />
        <Grid mb={6} gridTemplateColumns={gridTemplateColumnsProp} gridGap={4}>
          {
            // TODO: KeepKey adapter may fail due to the USB interface being in use by another tab
            // So not all of the supported wallets will have an initialized adapter
            wallets.map(walletType => (
              <WalletSelectItem
                key={walletType}
                walletType={walletType}
                walletInfo={walletInfo}
                connect={connect}
              />
            ))
          }
        </Grid>
        <Flex
          direction={flexDirProp}
          mb={mbProp}
          ml={mlProp}
          mt={2}
          justifyContent='center'
          alignItems='center'
        >
          <Button variant='link' borderTopRadius='none' colorScheme='blue' onClick={handleCreate}>
            {translate('walletProvider.selectModal.create')}
          </Button>
          <Text
            mx={1}
            color='text.subtle'
            colorScheme='blue'
            translation={'walletProvider.selectModal.or'}
          />
          <Button
            mr={1}
            variant='link'
            borderTopRadius='none'
            colorScheme='blue'
            onClick={handleImport}
          >
            {translate('walletProvider.selectModal.import')}
          </Button>
          <Text
            color='text.subtle'
            colorScheme='blue'
            translation={'walletProvider.selectModal.aWallet'}
          />
        </Flex>
      </ModalBody>
    </>
  )
}
