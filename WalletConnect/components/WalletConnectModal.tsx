import ModalStore from '../store/ModalStore'
import SessionProposalModal from '../views/SessionProposalModal'
import SessionSignModal from '../views/SessionSignModal'
import SessionUnsuportedMethodModal from '../views/SessionUnsuportedMethodModal'
import { Modal as NextModal } from '@nextui-org/react'
import { useSnapshot } from 'valtio'
import { PublicKey } from '@solana/web3.js'

export default function Modal({ accounts }: { accounts: PublicKey[] }) {
  const { open, view } = useSnapshot(ModalStore.state)

  return (
    <NextModal
      blur
      open={open}
      style={{ border: '1px solid rgba(139, 139, 139, 0.4)' }}
    >
      {view === 'SessionProposalModal' && (
        <SessionProposalModal accounts={accounts} />
      )}
      {view === 'SessionUnsuportedMethodModal' && (
        <SessionUnsuportedMethodModal />
      )}
      {view === 'SessionSignSolanaModal' && <SessionSignModal />}
    </NextModal>
  )
}
