import { InstructionData } from '@solana/spl-governance'

import {
  Connection,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import { simulateTransaction } from '../utils/send'
import { WalletAdapter } from '@solana/wallet-adapter-base'

export async function dryRunInstruction(
  connection: Connection,
  wallet: WalletAdapter,
  instructionsData: InstructionData[],
  prerequisiteInstructionsToRun?: TransactionInstruction[] | undefined
) {
  const transaction = new Transaction({ feePayer: wallet.publicKey })
  if (prerequisiteInstructionsToRun) {
    prerequisiteInstructionsToRun.map((x) => transaction.add(x))
  }
  if (instructionsData) {
    for (const i of instructionsData) {
      transaction.add({
        keys: i.accounts,
        programId: i.programId,
        data: Buffer.from(i.data),
      })
    }
  }

  const result = await simulateTransaction(connection, transaction, 'single')

  return { response: result.value, transaction }
}
