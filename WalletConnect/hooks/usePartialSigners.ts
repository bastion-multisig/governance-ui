import { IDL } from '@bastion-multisig/multisig-tx/lib/idl/partial_signer'
import { PARTIAL_SIGNER_PROGRAM_ID } from '@bastion-multisig/multisig-tx/lib/pda'
import {
  AnchorProvider,
  BorshCoder,
  Coder,
  Program,
} from '@project-serum/anchor'
import { useMemo } from 'react'
import useWalletStore from 'stores/useWalletStore'

const programId = PARTIAL_SIGNER_PROGRAM_ID
let coder: Coder | undefined

export function usePartialSigners() {
  const wallet = useWalletStore((store) => store.current)
  const connection = useWalletStore((store) => store.connection.current)
  return useMemo(() => {
    if (!wallet || !wallet.publicKey || !connection) {
      return undefined
    }
    const provider = new AnchorProvider(
      connection,
      wallet as any,
      AnchorProvider.defaultOptions()
    )
    if (!coder) {
      coder = new BorshCoder(IDL)
    }
    return new Program(IDL, programId, provider, coder)
  }, [wallet, wallet?.publicKey?.toBase58(), connection])
}
