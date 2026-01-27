import Cookies from 'js-cookie'

export const TOKEN_KEY = 'auth_token'
export const USER_KEY = 'user_data'

export const setAuthToken = (token: string) => {
  Cookies.set(TOKEN_KEY, token, { expires: 1 }) // 1 day
}

export const getAuthToken = (): string | undefined => {
  return Cookies.get(TOKEN_KEY)
}

export const removeAuthToken = () => {
  Cookies.remove(TOKEN_KEY)
  Cookies.remove(USER_KEY)
}

export const setUserData = (user: any) => {
  Cookies.set(USER_KEY, JSON.stringify(user), { expires: 1 })
}

export const getUserData = () => {
  const userData = Cookies.get(USER_KEY)
  return userData ? JSON.parse(userData) : null
}

export const isAuthenticated = (): boolean => {
  return !!getAuthToken()
}