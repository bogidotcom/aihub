import { createContext, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api.js'
import { tg, initTelegram } from './telegram.js'

const Ctx = createContext({ user: null, ready: false, config: null })

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [config, setConfig] = useState(null)

  useEffect(() => {
    initTelegram()
    api('/config').then(setConfig).catch(() => {})
    ;(async () => {
      try {
        if (tg?.initData) {
          const d = await api('/auth/tma', { method: 'POST', body: { initData: tg.initData } })
          setToken(d.token)
          setUser(d.user)
        } else if (getToken()) {
          const d = await api('/me')
          setUser(d.user)
        }
      } catch {
        setToken(null)
      }
      setReady(true)
    })()
  }, [])

  const loginWidget = async (widgetUser) => {
    const d = await api('/auth/widget', { method: 'POST', body: widgetUser })
    setToken(d.token)
    setUser(d.user)
  }

  const logout = () => { setToken(null); setUser(null) }

  return <Ctx.Provider value={{ user, ready, config, loginWidget, logout }}>{children}</Ctx.Provider>
}

export const useSession = () => useContext(Ctx)
