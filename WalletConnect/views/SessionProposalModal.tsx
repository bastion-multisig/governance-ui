import ProjectInfoCard from '../components/ProjectInfoCard'
import RequesDetailsCard from '../components/RequestDetalilsCard'
import RequestMethodCard from '../components/RequestMethodCard'
import RequestModalContainer from '../components/RequestModalContainer'
import ModalStore from '../store/ModalStore'
import { Button, Divider, Modal, Text } from '@nextui-org/react'
import { useWalletConnectContext } from 'WalletConnect/store/WalletConnectContext'
import { PublicKey } from '@solana/web3.js'

export default function SessionProposalModal({
  accounts,
}: {
  accounts: PublicKey[]
}) {
  const { approveSession, rejectSession } = useWalletConnectContext()

  // Get proposal data and wallet address from store
  const proposal = ModalStore.state.data?.proposal

  // Ensure proposal is defined
  if (!proposal) {
    return <Text>Missing proposal data</Text>
  }

  // Get required proposal data
  const { proposer, permissions, relay } = proposal
  const { chains } = permissions.blockchain
  const { methods } = permissions.jsonrpc

  // Handle approve action
  async function onApprove() {
    if (proposal && accounts.length > 0) {
      approveSession(proposal, accounts)
    }
    ModalStore.close()
  }

  // Hanlde reject action
  async function onReject() {
    if (proposal) {
      rejectSession(proposal)
    }
    ModalStore.close()
  }

  return (
    <>
      <RequestModalContainer title="Session Proposal">
        <ProjectInfoCard metadata={proposer.metadata} />

        <Divider y={2} />

        <RequesDetailsCard chains={chains} protocol={relay.protocol} />

        <Divider y={2} />

        <RequestMethodCard methods={methods} />
      </RequestModalContainer>

      <Modal.Footer>
        <Button auto flat color="error" onClick={onReject}>
          {accounts.length > 0 ? 'Reject' : 'Governance not selected'}
        </Button>

        {accounts.length > 0 && (
          <Button auto flat color="success" onClick={onApprove}>
            Approve
          </Button>
        )}
      </Modal.Footer>
    </>
  )
}
