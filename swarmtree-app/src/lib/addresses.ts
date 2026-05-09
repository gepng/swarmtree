// ENS Registry on mainnet. Its `owner(node)` returns the address authorised to
// set records — resolver, contenthash, addr — i.e. the manager of the name.
// Forward resolution (addr) can point anywhere and does not imply control.
export const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const

// Names migrated to the ENS NameWrapper hold registry ownership at this
// contract; the real controller is NameWrapper.ownerOf(uint256(node)).
export const NAME_WRAPPER = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401" as const

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
