export interface ProfileLink {
  label: string
  url: string
  icon?: string
}

export interface Profile {
  version: 1
  address?: string
  ens?: string | null
  title: string
  description: string
  links: ProfileLink[]
  updatedAt?: string
}
