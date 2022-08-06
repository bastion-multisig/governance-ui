import React, { SetStateAction, useContext, useEffect, useState } from 'react'
import { Transaction } from '@solana/web3.js'
import useWalletStore from 'stores/useWalletStore'
import {
  BastionTransactionForm,
  UiInstruction,
} from '@utils/uiTypes/proposalCreationTypes'
import { NewProposalContext } from '../../../new'
import useGovernanceAssets from '@hooks/useGovernanceAssets'
import {
  Governance,
  serializeInstructionToBase64,
} from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import DappSelect from './components/DappSelect'
import { isFormValid } from '@utils/formValidation'
import * as yup from 'yup'
import WalletConnectQrReader from 'WalletConnect/components/WalletConnectQrReader'
import { WalletConnectProvider } from 'WalletConnect/store/WalletConnectContext'
import { TxInterpreter } from '@bastion-multisig/multisig-tx'
import WalletConnectModal from 'WalletConnect/components/WalletConnectModal'
import ProjectInfoCard from 'WalletConnect/components/ProjectInfoCard'
import RequestDataCard from 'WalletConnect/components/RequestDataCard'
import {
  serialiseTransaction,
  serializeAllTransactions,
} from '@bastion-multisig/solana-wallet'
import { SessionTypes } from '@walletconnect/types'
import GovernedAccountSelect from '../../GovernedAccountSelect'
import { AssetAccount } from '@utils/uiTypes/assets'

interface DappData {
  key: string
  label: string
  url: string
}

const Bastion = ({
  index,
  governance, // eslint-disable-line
}: {
  index: number
  governance: ProgramAccount<Governance> | null
}) => {
  const connection = useWalletStore((s) => s.connection)
  const { nativeTreasuries } = useGovernanceAssets()
  const [form, setForm] = useState<BastionTransactionForm>({})
  const [formErrors, setFormErrors] = useState({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  const handleSetForm = (
    setFormAction: SetStateAction<BastionTransactionForm>
  ) => {
    setFormErrors({})
    setForm(setFormAction)
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
    // governedAccount: yup
    //   .object()
    //   .nullable()
    //   .required('Governed account is required'),
  })

  const onRequestApproved = async (
    transactions: Transaction[],
    requestSession: SessionTypes.Settled
  ) => {
    handleSetForm(
      (form): BastionTransactionForm => {
        return {
          ...form,
          transactionsWithSession: [
            ...(form.transactionsWithSession ?? []),
            {
              transactions,
              requestSession,
            },
          ],
        }
      }
    )
  }

  const validateInstruction = async (): Promise<boolean> => {
    const { isValid, validationErrors } = await isFormValid(schema, form)
    setFormErrors(validationErrors)
    return isValid
  }

  async function getInstruction(): Promise<UiInstruction> {
    const isValid = await validateInstruction()
    if (!isValid || !form.transactionsWithSession || !form.nativeTreasury) {
      return {
        isValid: false,
        governance: form.nativeTreasury?.governance,
      }
    }

    const txs = form.transactionsWithSession.flatMap((txs) => txs.transactions)
    const proposalTxs = await TxInterpreter.proposal(txs)
    const serializedTransactions = proposalTxs.map((tx) =>
      tx.map(serializeInstructionToBase64)
    )

    return {
      isValid: true,
      governance: form.nativeTreasury.governance,
      serializedTransactions,
    }
  }

  useEffect(() => {
    handleSetInstructions(
      {
        governedAccount: form.nativeTreasury?.governance,
        getInstruction,
      },
      index
    )
  }, [form])

  return (
    <WalletConnectProvider onRequestApproved={onRequestApproved}>
      <WalletConnectModal
        accounts={form.nativeTreasury ? [form.nativeTreasury.pubkey] : []}
      />

      <GovernedAccountSelect
        onChange={(nativeTreasury: AssetAccount) => {
          handleSetForm(
            (form): BastionTransactionForm => {
              return { ...form, nativeTreasury }
            }
          )
        }}
        value={form.nativeTreasury}
        error={formErrors['governedAccount']}
        governedAccounts={nativeTreasuries}
        label="Treasury to connect as"
        autoselectFirst={true}
      />
      <WalletConnectQrReader />
      <DappSelect
        label="Open Bastion dApp"
        onChange={onDappChanged}
        dApps={dApps}
        value={dApp}
      />

      {form.transactionsWithSession &&
        form.transactionsWithSession.map((txs) => {
          return (
            <>
              <ProjectInfoCard metadata={txs.requestSession.peer.metadata} />
              <RequestDataCard
                data={
                  txs.transactions.length === 1
                    ? (serialiseTransaction(txs.transactions[0]) as any)
                    : serializeAllTransactions(txs.transactions)
                }
              />
            </>
          )
        })}
    </WalletConnectProvider>
  )
}

export default Bastion
