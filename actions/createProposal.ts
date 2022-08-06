import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js'

import {
  getGovernanceProgramVersion,
  getInstructionDataFromBase64,
  Governance,
  ProgramAccount,
  Realm,
  TokenOwnerRecord,
  VoteType,
  withCreateProposal,
  getSignatoryRecordAddress,
  getNativeTreasuryAddress,
} from '@solana/spl-governance'
import { RpcContext } from '@solana/spl-governance'
import { InstructionData } from '@solana/spl-governance'
import { withSignOffProposal } from '@solana/spl-governance'
import { sendAll } from '@utils/sendTransactions'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'
import { VotingClient } from '@utils/uiTypes/VotePlugin'
import { withAddSignatory } from '@solana/spl-governance'
import {
  AccountMetaDataBrief,
  getProposalTransactionSpace,
  InstructionDataBrief,
  withInsertInstruction,
  withInsertTransaction2,
} from 'WalletConnect/actions/withInsertTransaction2'
import { PartialSigner, TxInterpreter } from '@bastion-multisig/multisig-tx'
import { Program } from '@project-serum/anchor'

export interface InstructionDataWithHoldUpTime {
  data: InstructionData[] | null
  holdUpTime: number | undefined
  prerequisiteInstructions: TransactionInstruction[]
  signers?: Keypair[]
  prerequisiteInstructionsSigners?: Keypair[]
}

export class InstructionDataWithHoldUpTime {
  constructor({
    instruction,
    governance,
  }: {
    instruction: UiInstruction
    governance?: ProgramAccount<Governance>
  }) {
    this.data = instruction.serializedTransactions?.length
      ? instruction.serializedTransactions.flatMap((tx) =>
          tx.map(getInstructionDataFromBase64)
        )
      : null
    this.holdUpTime =
      instruction.customHoldUpTime !== undefined
        ? instruction.customHoldUpTime
        : governance?.account?.config.minInstructionHoldUpTime
    this.prerequisiteInstructions = instruction.prerequisiteInstructions || []
    this.prerequisiteInstructionsSigners =
      instruction.prerequisiteInstructionsSigners || []
  }
}

export const createProposal = async (
  { connection, wallet, programId, walletPubkey }: RpcContext,
  realm: ProgramAccount<Realm>,
  governance: PublicKey,
  tokenOwnerRecord: ProgramAccount<TokenOwnerRecord>,
  name: string,
  descriptionLink: string,
  governingTokenMint: PublicKey,
  proposalIndex: number,
  instructionsData: InstructionDataWithHoldUpTime[],
  isDraft: boolean,
  client?: VotingClient,
  partialSignerProgram?: Program<PartialSigner>
): Promise<PublicKey> => {
  const instructions: TransactionInstruction[] = []

  const governanceAuthority = walletPubkey
  const signatory = walletPubkey
  const payer = walletPubkey
  const prerequisiteInstructions: TransactionInstruction[] = []
  const prerequisiteInstructionsSigners: Keypair[] = []

  // Explicitly request the version before making RPC calls to work around race conditions in resolving
  // the version for RealmInfo

  // Changed this because it is misbehaving on my local validator setup.
  const programVersion = await getGovernanceProgramVersion(
    connection,
    programId
  )

  // V2 Approve/Deny configuration
  const voteType = VoteType.SINGLE_CHOICE
  const options = ['Approve']
  const useDenyOption = true

  //will run only if plugin is connected with realm
  const plugin = await client?.withUpdateVoterWeightRecord(
    instructions,
    tokenOwnerRecord,
    'createProposal',
    governance
  )

  const proposalAddress = await withCreateProposal(
    instructions,
    programId,
    programVersion,
    realm.pubkey!,
    governance,
    tokenOwnerRecord.pubkey,
    name,
    descriptionLink,
    governingTokenMint,
    governanceAuthority,
    proposalIndex,
    voteType,
    options,
    useDenyOption,
    payer,
    plugin?.voterWeightPk
  )

  await withAddSignatory(
    instructions,
    programId,
    programVersion,
    proposalAddress,
    tokenOwnerRecord.pubkey,
    governanceAuthority,
    signatory,
    payer
  )

  // TODO: Return signatoryRecordAddress from the SDK call
  const signatoryRecordAddress = await getSignatoryRecordAddress(
    programId,
    proposalAddress,
    signatory
  )

  // Gather prerequisite instuctions
  for (const instruction of instructionsData) {
    if (instruction.prerequisiteInstructions) {
      prerequisiteInstructions.push(...instruction.prerequisiteInstructions)
    }
    if (instruction.prerequisiteInstructionsSigners) {
      prerequisiteInstructionsSigners.push(
        ...instruction.prerequisiteInstructionsSigners
      )
    }
  }

  // Handle partial signers when necessary
  let proposedTransaction: InstructionData[][] = instructionsData
    .map((tx) => tx.data)
    .filter((tx) => tx) as InstructionData[][]
  if (partialSignerProgram) {
    const proposalInstructions = await TxInterpreter.proposal(
      partialSignerProgram,
      await getNativeTreasuryAddress(programId, governance),
      proposalAddress,
      instructionsData.map((data) => data.data)
    )

    // Map back to InstructionData[][] so borsh recognizes the object
    proposedTransaction = proposalInstructions.map((tx) =>
      tx.map(
        (tx) =>
          new InstructionData({
            programId: tx.programId,
            accounts: tx.keys,
            data: tx.data,
          })
      )
    )
  }

  const insertInstructions: TransactionInstruction[] = []
  // Insert transactions using the loader program
  for (let index = 0; index < proposedTransaction.length; index++) {
    const instruction = proposedTransaction[index]
    if (instruction) {
      const space = getProposalTransactionSpace(instruction)
      await withInsertTransaction2(
        insertInstructions,
        programId,
        programVersion,
        governance,
        proposalAddress,
        tokenOwnerRecord.pubkey,
        governanceAuthority,
        index,
        0,
        0,
        // Do not insert transactions yet.
        // Instructions will be pushed individually.
        [],
        payer,
        space
      )

      for (let i = 0; i < instruction.length; i++) {
        const instructionData = instruction[i]
        const instructionDataBrief = new InstructionDataBrief({
          accounts: instructionData.accounts.map(
            (acc) =>
              new AccountMetaDataBrief({
                isSigner: acc.isSigner,
                isWritable: acc.isWritable,
              })
          ),
          data: instructionData.data,
        })
        const instructionKeys = instructionData.accounts.map(
          (account) => account.pubkey
        )

        await withInsertInstruction(
          insertInstructions,
          programId,
          programVersion,
          governance,
          proposalAddress,
          tokenOwnerRecord.pubkey,
          governanceAuthority,
          index,
          0,
          instructionData.programId,
          instructionKeys,
          instructionDataBrief
        )
      }
    }
  }

  if (!isDraft) {
    withSignOffProposal(
      insertInstructions, // SignOff proposal needs to be executed after inserting instructions hence we add it to insertInstructions
      programId,
      programVersion,
      realm.pubkey,
      governance,
      proposalAddress,
      signatory,
      signatoryRecordAddress,
      undefined
    )
  }

  console.log(`Creating proposal using ${insertInstructions.length} chunks`)
  await sendAll({
    wallet,
    connection,
    signersSet: [
      [...prerequisiteInstructionsSigners],
      [],
      ...insertInstructions.map((_) => []),
    ],
    showUiComponent: true,
    transactionInstructions: [
      prerequisiteInstructions,
      instructions,
      ...insertInstructions.map((ix) => [ix]),
    ],
  })

  return proposalAddress
}
