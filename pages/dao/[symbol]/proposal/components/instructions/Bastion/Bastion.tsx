import React, { useContext, useEffect, useMemo, useState } from 'react'
import useRealm from '@hooks/useRealm'
import { PublicKey, Transaction } from '@solana/web3.js'
import useWalletStore from 'stores/useWalletStore'
import {
  BastionTransactionForm,
  ComponentInstructionData,
  Instructions,
  UiInstruction,
} from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import {
  Governance,
  serializeInstructionToBase64,
} from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import GovernedAccountSelect from '../../GovernedAccountSelect'
import { DappData, DappSelect } from './components/DappSelect'
import { createObligationAccount } from '@tools/sdk/solend/createObligationAccount'
import { isFormValid } from '@utils/formValidation'
import * as yup from 'yup'
import WalletConnectQrReader from 'WalletConnect/components/WalletConnectQrReader'
import { WalletConnectProvider } from 'WalletConnect/store/WalletConnectContext'
import { TxInterpreter } from '@bastion-multisig/multisig-tx'
import WalletConnectModal from 'WalletConnect/components/WalletConnectModal'
import RequestModalContainer from 'WalletConnect/components/RequestModalContainer'
import ProjectInfoCard from 'WalletConnect/components/ProjectInfoCard'
import RequestDataCard from 'WalletConnect/components/RequestDataCard'
import {
  serialiseTransaction,
  serializeAllTransactions,
} from '@bastion-multisig/solana-wallet'
import { SessionTypes } from '@walletconnect/types'

const Bastion = ({
  index,
  governance,
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const connection = useWalletStore((s) => s.connection)
  const wallet = useWalletStore((s) => s.current)
  const { realmInfo } = useRealm()
  const { assetAccounts } = useGovernanceAssets()
  const shouldBeGoverned = index !== 0 && governance
  const programId: PublicKey | undefined = realmInfo?.programId
  const [form, setForm] = useState<BastionTransactionForm>({})
  const [formErrors, setFormErrors] = useState({})
  const { instructionsData, handleSetInstructions } = useContext(
    NewProposalContext
  )
  const handleSetForm = ({ propertyName, value }) => {
    setFormErrors({})
    setForm({ ...form, [propertyName]: value })
  }
  const [dApp, setdApp] = useState<DappData>()
  const onDappChanged = (value: DappData) => {
    setdApp(value)
    window.open(value.url, '_newtab')
  }

  const devnetLinks = connection.cluster === 'devnet'
  const devnet = devnetLinks ? 'devnet.' : ''
  const dApps: DappData[] = [
    {
      key: 'Raydium',
      label: `Raydium Dex ${devnetLinks ? '(Mainnet-beta only)' : ''}`,
      url: 'https://raydium-dex.bastion.community',
    },
    {
      key: 'Jet',
      label: 'Jet Protocol',
      url: `https://jet.${devnet}bastion.community`,
    },
  ]
  const schema = yup.object().shape({
    governedAccount: yup
      .object()
      .nullable()
      .required('Governed account is required'),
  })

  const onRequestApproved = async (
    transactions: Transaction[],
    requestSession: SessionTypes.Settled
  ) => {
    if (!transactions) {
      // If a transaction has not been set, apply it to this component
      handleSetForm({ propertyName: 'transactions', value: transactions })
      handleSetForm({ propertyName: 'requestSession', value: requestSession })
    } else {
      // If a transaction has already been set, insert a new component for it
      const appendedTransaction: ComponentInstructionData = {
        governedAccount: form.governedAccount?.governance,
        getInstruction: undefined, //() => Promise<UiInstruction>
        type: {
          id: Instructions.Bastion,
          name: '',
          isVisible: true,
        },
      }
      handleSetInstructions(appendedTransaction, instructionsData.length)
    }
  }

  const validateInstruction = async (): Promise<boolean> => {
    const { isValid, validationErrors } = await isFormValid(schema, form)
    setFormErrors(validationErrors)
    return isValid
  }

  async function getInstruction(): Promise<UiInstruction> {
    const isValid = await validateInstruction()

    if (
      !connection ||
      !isValid ||
      !programId ||
      !form.governedAccount?.governance?.account ||
      !wallet?.publicKey
    ) {
      return {
        isValid: false,
        governance: form.governedAccount?.governance,
      }
    }

    const ix = await createObligationAccount({
      fundingAddress: wallet.publicKey,
      walletAddress: form.governedAccount.governance.pubkey,
    })

    const tx = new Transaction().add(ix)

    return {
      isValid: true,
      governance: form.governedAccount.governance,
      serializedTransactions: (await TxInterpreter.proposal([tx])).map((tx) =>
        tx.map(serializeInstructionToBase64)
      ),
    }
  }

  useEffect(() => {
    handleSetInstructions(
      {
        governedAccount: form.governedAccount?.governance,
        getInstruction,
      },
      index
    )
  }, [form])

  const transactionData = useMemo(() => {
    if (!form.transactions) {
      return {}
    } else if (form.transactions.length === 0) {
      return JSON.stringify(serialiseTransaction(form.transactions[0]))
    } else {
      return JSON.stringify(serializeAllTransactions(form.transactions))
    }
  }, [form.transactions])

  return (
    <WalletConnectProvider onRequestApproved={onRequestApproved}>
      <WalletConnectModal
        accounts={
          form.governedAccount ? [form.governedAccount.governance.pubkey] : []
        }
      />

      {!form.transactions ? (
        <>
          <GovernedAccountSelect
            label="Governance to connect as"
            governedAccounts={assetAccounts}
            onChange={(value) => {
              handleSetForm({ value, propertyName: 'governedAccount' })
            }}
            value={form.governedAccount}
            error={formErrors['governedAccount']}
            shouldBeGoverned={shouldBeGoverned}
            governance={governance}
          />
          <WalletConnectQrReader />
          <DappSelect
            label="Open Bastion dApp"
            onChange={onDappChanged}
            dApps={dApps}
            value={dApp}
          />
        </>
      ) : (
        <RequestModalContainer title="Sign Message">
          {form.requestSession && (
            <ProjectInfoCard metadata={form.requestSession.peer.metadata} />
          )}

          <RequestDataCard data={transactionData} />
        </RequestModalContainer>
      )}
    </WalletConnectProvider>
  )
}

export default Bastion
