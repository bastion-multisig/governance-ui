import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js'
import { serialize } from 'borsh'
import {
  AccountMetaData,
  getProposalTransactionAddress,
  GovernanceInstruction,
  InstructionData,
  PROGRAM_VERSION_V1,
  PROGRAM_VERSION_V2,
  SYSTEM_PROGRAM_ID,
} from '@solana/spl-governance'

export class InsertTransactionArgs2 {
  instruction: GovernanceInstruction = GovernanceInstruction.InsertTransaction
  index: number
  optionIndex: number
  holdUpTime: number

  // V1
  instructionData: InstructionData | undefined

  maxSizeOption: number
  maxSize: number
  // V2
  instructions: InstructionData[] | undefined

  constructor(args: {
    index: number
    optionIndex: number
    holdUpTime: number
    // V1
    instructionData: InstructionData | undefined
    // V2
    maxSize?: number
    instructions: InstructionData[] | undefined
  }) {
    this.index = args.index
    this.optionIndex = args.optionIndex
    this.holdUpTime = args.holdUpTime
    // V1
    this.instructionData = args.instructionData
    // V2
    this.instructions = args.instructions
    this.maxSizeOption = args.maxSize !== undefined ? 1 : 0
    this.maxSize = args.maxSize ?? 0
  }
}

export class InsertInstructionArgs {
  instruction: GovernanceInstruction = 26

  instructionData: InstructionDataBrief

  constructor(args: { instructionData: InstructionDataBrief }) {
    this.instructionData = args.instructionData
  }
}

export class InstructionDataBrief {
  accounts: AccountMetaDataBrief[]
  data: Uint8Array

  constructor(args: { accounts: AccountMetaDataBrief[]; data: Uint8Array }) {
    this.accounts = args.accounts
    this.data = args.data
  }
}

export class AccountMetaDataBrief {
  isSigner: boolean
  isWritable: boolean

  constructor(args: { isSigner: boolean; isWritable: boolean }) {
    this.isSigner = !!args.isSigner
    this.isWritable = !!args.isWritable
  }
}

function createGovernanceSchema() {
  return new Map<Function, any>([
    // Insert transaction args
    [
      InsertTransactionArgs2,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
          ['optionIndex', 'u8'],
          ['index', 'u16'],
          ['holdUpTime', 'u32'],
          ['maxSizeOption', 'u8'],
          ['maxSize', 'u64'],
          ['instructions', [InstructionData]],
        ].filter(Boolean),
      },
    ],
    [
      InstructionData,
      {
        kind: 'struct',
        fields: [
          ['programId', 'pubkey'],
          ['accounts', [AccountMetaData]],
          ['data', ['u8']],
        ],
      },
    ],
    [
      AccountMetaData,
      {
        kind: 'struct',
        fields: [
          ['pubkey', 'pubkey'],
          ['isSigner', 'u8'],
          ['isWritable', 'u8'],
        ],
      },
    ],

    // Insert instruction args
    [
      AccountMetaDataBrief,
      {
        kind: 'struct',
        fields: [
          ['isSigner', 'u8'],
          ['isWritable', 'u8'],
        ].filter(Boolean),
      },
    ],
    [
      InstructionDataBrief,
      {
        kind: 'struct',
        fields: [
          ['accounts', [AccountMetaDataBrief]],
          ['data', ['u8']],
        ].filter(Boolean),
      },
    ],
    [
      InsertInstructionArgs,
      {
        kind: 'struct',
        fields: [
          ['instruction', 'u8'],
          ['instructionData', InstructionDataBrief],
        ].filter(Boolean),
      },
    ],
  ])
}

export const withInsertTransaction2 = async (
  instructions: TransactionInstruction[],
  programId: PublicKey,
  programVersion: number,
  governance: PublicKey,
  proposal: PublicKey,
  tokenOwnerRecord: PublicKey,
  governanceAuthority: PublicKey,
  index: number,
  optionIndex: number,
  holdUpTime: number,
  transactionInstructions: InstructionData[],
  payer: PublicKey,
  maxSize?: number
) => {
  const args = new InsertTransactionArgs2({
    index,
    optionIndex,
    holdUpTime,
    instructionData:
      programVersion === PROGRAM_VERSION_V1
        ? transactionInstructions[0]
        : undefined,
    instructions:
      programVersion >= PROGRAM_VERSION_V2
        ? transactionInstructions
        : undefined,
    maxSize,
  })
  const data = Buffer.from(serialize(createGovernanceSchema(), args))

  const proposalTransactionAddress = await getProposalTransactionAddress(
    programId,
    programVersion,
    proposal,
    optionIndex,
    index
  )

  const keys = [
    {
      pubkey: governance,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: proposal,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: tokenOwnerRecord,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: governanceAuthority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: proposalTransactionAddress,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: payer,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: SYSTEM_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ]

  instructions.push(
    new TransactionInstruction({
      keys,
      programId,
      data,
    })
  )

  return proposalTransactionAddress
}

export const withInsertInstruction = async (
  instructions: TransactionInstruction[],
  programId: PublicKey,
  programVersion: number,
  governance: PublicKey,
  proposal: PublicKey,
  tokenOwnerRecord: PublicKey,
  governanceAuthority: PublicKey,
  index: number,
  optionIndex: number,
  instructionProgramId: PublicKey,
  instructionKeys: PublicKey[],
  instruction: InstructionDataBrief
) => {
  const args = new InsertInstructionArgs({
    instructionData: instruction,
  })
  const data = Buffer.from(serialize(createGovernanceSchema(), args))

  const proposalTransactionAddress = await getProposalTransactionAddress(
    programId,
    programVersion,
    proposal,
    optionIndex,
    index
  )

  const keys = [
    {
      pubkey: governance,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: proposal,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: tokenOwnerRecord,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: governanceAuthority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: proposalTransactionAddress,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: instructionProgramId,
      isWritable: false,
      isSigner: false,
    },
    ...instructionKeys.map((pubkey) => {
      return {
        pubkey,
        isWritable: false,
        isSigner: false,
      }
    }),
  ]

  instructions.push(
    new TransactionInstruction({
      keys,
      programId,
      data,
    })
  )

  return proposalTransactionAddress
}

export function getProposalTransactionSpace(
  instructionData: InstructionData[]
) {
  return (
    instructionData
      .map((ix) => {
        return ix.accounts.length * 34 + ix.data.length + 40
      })
      .reduce((sum, len) => sum + len, 0) + 62
  )
}
