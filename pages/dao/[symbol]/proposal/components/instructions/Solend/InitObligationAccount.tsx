/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React, { useContext, useEffect, useState } from 'react'
import * as yup from 'yup'
import {
  Governance,
  ProgramAccount,
  serializeInstructionToBase64,
} from '@solana/spl-governance'
import { PublicKey } from '@solana/web3.js'

import useRealm from '@hooks/useRealm'
import { initObligationAccount } from '@tools/sdk/solend/initObligationAccount'
import { isFormValid } from '@utils/formValidation'
import {
  InitSolendObligationAccountForm,
  UiInstruction,
} from '@utils/uiTypes/proposalCreationTypes'

import useWalletStore from 'stores/useWalletStore'

import { NewProposalContext } from '../../../new'
import GovernedAccountSelect from '../../GovernedAccountSelect'
import useGovernanceAssets from '@hooks/useGovernanceAssets'

const InitObligationAccount = ({
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

  // Hardcoded gate used to be clear about what cluster is supported for now
  if (connection.cluster !== 'mainnet') {
    return <>This instruction does not support {connection.cluster}</>
  }

  const shouldBeGoverned = index !== 0 && governance
  const programId: PublicKey | undefined = realmInfo?.programId
  const [form, setForm] = useState<InitSolendObligationAccountForm>({})
  const [formErrors, setFormErrors] = useState({})
  const { handleSetInstructions } = useContext(NewProposalContext)

  const handleSetForm = ({ propertyName, value }) => {
    setFormErrors({})
    setForm({ ...form, [propertyName]: value })
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

    const tx = await initObligationAccount({
      obligationOwner: form.governedAccount.governance.pubkey,
    })

    return {
      serializedTransactions: [[serializeInstructionToBase64(tx)]],
      isValid: true,
      governance: form.governedAccount.governance,
    }
  }

  useEffect(() => {
    handleSetForm({
      propertyName: 'programId',
      value: programId?.toString(),
    })
  }, [programId])

  useEffect(() => {
    handleSetInstructions(
      {
        governedAccount: form.governedAccount?.governance,
        getInstruction,
      },
      index
    )
  }, [form])

  const schema = yup.object().shape({
    governedAccount: yup
      .object()
      .nullable()
      .required('Governed account is required'),
  })

  return (
    <GovernedAccountSelect
      label="Governance"
      governedAccounts={assetAccounts}
      onChange={(value) => {
        handleSetForm({ value, propertyName: 'governedAccount' })
      }}
      value={form.governedAccount}
      error={formErrors['governedAccount']}
      shouldBeGoverned={shouldBeGoverned}
      governance={governance}
    />
  )
}

export default InitObligationAccount
