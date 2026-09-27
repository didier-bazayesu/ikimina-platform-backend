import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'

interface BackendMemberProfile {
  id: string
  userId: string
  memberNumber: string
  fullName: string
  nationalId: string
  address: string
  joinedDate: string
  createdAt: string
  email: string
  phone: string
  status: string
}

export function useCurrentMember() {
  const { data: rawData } = useQuery({
    queryKey: ['currentMember'],
    queryFn: async () => {
      const res = await api.get<any>('/members/me')
      // If the backend wraps the payload in a second { data: ... } envelope without a success flag,
      // unwrap it here manually so we get the actual BackendMemberProfile.
      return (res.data?.data || res.data) as BackendMemberProfile
    },
  })

  const data = rawData

  if (!data || !data.fullName) {
    return {
      firstName: '',
      lastName: '',
      fullName: '',
      memberNumber: '',
      initials: ''
    }
  }

  const parts = data.fullName.split(' ')
  const firstName = parts[0] || ''
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : ''
  const initials = `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ''}`.toUpperCase()

  return {
    firstName,
    lastName,
    fullName: data.fullName,
    memberNumber: data.memberNumber.replace('IKM-', ''),
    initials,
    joinedDate: data.joinedDate,
    phone: data.phone,
    address: data.address,
    email: data.email,
    nationalId: data.nationalId,
    rawData: data // just in case
  }
}



