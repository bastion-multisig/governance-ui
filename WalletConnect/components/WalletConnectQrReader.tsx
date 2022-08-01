import { SecondaryButton } from '../../components/Button'
import Input from '@components/inputs/Input'
import { Loading, Text } from '@nextui-org/react'
import { useState } from 'react'
import { useWalletConnectContext } from 'WalletConnect/store/WalletConnectContext'
import QrReader from './QrReader'

export default function WalletConnectQrReader() {
  const { walletConnectClient } = useWalletConnectContext()

  const [uri, setUri] = useState('')
  const [loading, setLoading] = useState(false)

  async function onConnect(uri: string) {
    try {
      setLoading(true)
      await walletConnectClient?.pair({ uri })
    } catch (err: unknown) {
      console.log(err)
      alert(err)
    } finally {
      setUri('')
      setLoading(false)
    }
  }

  return walletConnectClient ? (
    <>
      <QrReader onConnect={onConnect} />

      <Input
        label="Or use walletconnect uri"
        type="text"
        aria-label="wc url connect input"
        placeholder="e.g. wc:a281567bb3e4..."
        onChange={(e) => setUri(e.target.value)}
        value={uri}
      />
      <SecondaryButton
        small
        disabled={!uri}
        style={{}}
        onClick={() => onConnect(uri)}
      >
        {loading ? <Loading size="sm" /> : 'Connect'}
      </SecondaryButton>
    </>
  ) : (
    <Text>Connecting to WalletConnect</Text>
  )
}
