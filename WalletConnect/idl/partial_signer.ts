export type PartialSigner = {
  version: '0.1.0'
  name: 'partial_signer'
  constants: [
    {
      name: 'PARTIAL_SIGNER_SET'
      type: {
        defined: '&[u8]'
      }
      value: 'b"partial-signer-set"'
    }
  ]
  instructions: [
    {
      name: 'initPartialSignerSet'
      accounts: [
        {
          name: 'authority'
          isMut: false
          isSigner: true
        },
        {
          name: 'payer'
          isMut: true
          isSigner: true
        },
        {
          name: 'partialSignerSet'
          isMut: true
          isSigner: false
        },
        {
          name: 'systemProgram'
          isMut: false
          isSigner: false
        }
      ]
      args: [
        {
          name: 'seed'
          type: 'u64'
        },
        {
          name: 'partialSigners'
          type: {
            vec: 'publicKey'
          }
        },
        {
          name: 'maxPartialSigners'
          type: 'u16'
        }
      ]
    }
  ]
  accounts: [
    {
      name: 'partialSignerSet'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'authority'
            type: 'publicKey'
          },
          {
            name: 'partialSigners'
            type: {
              vec: {
                defined: 'PartialSigner'
              }
            }
          }
        ]
      }
    }
  ]
  types: [
    {
      name: 'PartialSigner'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'key'
            type: 'publicKey'
          },
          {
            name: 'index'
            type: 'publicKey'
          },
          {
            name: 'bump'
            type: 'u8'
          }
        ]
      }
    }
  ]
  errors: [
    {
      code: 6000
      name: 'InvalidPartialSignerAuthority'
      msg: 'Invalid partial signer authority'
    }
  ]
}

export const IDL: PartialSigner = {
  version: '0.1.0',
  name: 'partial_signer',
  constants: [
    {
      name: 'PARTIAL_SIGNER_SET',
      type: {
        defined: '&[u8]',
      },
      value: 'b"partial-signer-set"',
    },
  ],
  instructions: [
    {
      name: 'initPartialSignerSet',
      accounts: [
        {
          name: 'authority',
          isMut: false,
          isSigner: true,
        },
        {
          name: 'payer',
          isMut: true,
          isSigner: true,
        },
        {
          name: 'partialSignerSet',
          isMut: true,
          isSigner: false,
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: 'seed',
          type: 'u64',
        },
        {
          name: 'partialSigners',
          type: {
            vec: 'publicKey',
          },
        },
        {
          name: 'maxPartialSigners',
          type: 'u16',
        },
      ],
    },
  ],
  accounts: [
    {
      name: 'partialSignerSet',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'authority',
            type: 'publicKey',
          },
          {
            name: 'partialSigners',
            type: {
              vec: {
                defined: 'PartialSigner',
              },
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: 'PartialSigner',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'key',
            type: 'publicKey',
          },
          {
            name: 'index',
            type: 'publicKey',
          },
          {
            name: 'bump',
            type: 'u8',
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: 'InvalidPartialSignerAuthority',
      msg: 'Invalid partial signer authority',
    },
  ],
}
