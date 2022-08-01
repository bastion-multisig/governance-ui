import { SecondaryButton } from '@components/Button'
import { Loading } from '@nextui-org/react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useState } from 'react'

/**
 * You can use normal import if you are not within next / ssr environment
 * @info https://nextjs.org/docs/advanced-features/dynamic-import
 */
const ReactQrReader = dynamic(() => import('react-qr-reader-es6'), {
  ssr: false,
})

/**
 * Types
 */
interface IProps {
  onConnect: (uri: string) => Promise<void>
}

/**
 * Component
 */
export default function QrReader({ onConnect }: IProps) {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  function onError() {
    setShow(false)
  }

  async function onScan(data: string | null) {
    if (data) {
      await onConnect(data)
      setShow(false)
    }
  }

  function onShowScanner() {
    setLoading(true)
    setShow(true)
  }

  return (
    <div className="">
      {show ? (
        <>
          {loading && <Loading css={{ position: 'absolute' }} />}
          <div
            style={{
              width: '100%',
              borderRadius: 15,
              overflow: 'hidden !important',
              position: 'relative',
            }}
          >
            <ReactQrReader
              onLoad={() => setLoading(false)}
              showViewFinder={false}
              onError={onError}
              onScan={onScan}
              style={{ width: '100%' }}
            />
          </div>
        </>
      ) : (
        <div
          className="max-w-lg"
          style={{
            marginBottom: 0,
            marginTop: 0,
            border: '2px rgba(139, 139, 139, 0.4) dashed',
            width: '100%',
            borderRadius: 15,
            padding: 50,
            display: 'flex',
            flex: '1 1',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Image
            src="/icons/qr-icon.svg"
            width={100}
            height={100}
            alt="qr code icon"
            className="qrIcon"
          />
          <SecondaryButton
            style={{ marginTop: 24, width: '75%' }}
            onClick={onShowScanner}
          >
            Scan QR code
          </SecondaryButton>
        </div>
      )}
    </div>
  )
}
