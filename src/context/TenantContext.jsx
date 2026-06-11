import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const TenantContext = createContext(null)

export function TenantProvider({ children }) {
  const { user } = useAuth()
  const [tenant, setTenant] = useState(null)
  const [instellingen, setInstellingen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user === undefined) return
    if (user === null) {
      setTenant(null)
      setInstellingen(null)
      setLoading(false)
      return
    }

    async function laadTenant() {
      try {
        const tenantId = user.app_metadata?.tenant_id
        const [
          { data: tenantData,       error: tenantError       },
          { data: instellingenData, error: instellingenError },
        ] = await Promise.all([
          supabase.from('tenants').select('*').single(),
          supabase.from('tenant_instellingen').select('*').eq('tenant_id', tenantId).single(),
        ])
        if (tenantError)       throw tenantError
        if (instellingenError) throw instellingenError
        setTenant(tenantData)
        setInstellingen(instellingenData)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    laadTenant()
  }, [user])

  useEffect(() => {
    const url = tenant?.logo_url
    if (!url) return
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = url
  }, [tenant])

  function kolomZichtbaar(tabel, kolom) {
    if (!instellingen?.kolommen_config) return true
    return instellingen.kolommen_config[tabel]?.[kolom] ?? true
  }

  function moduleZichtbaar(module) {
    if (!instellingen?.modules_config) return true
    return instellingen.modules_config[module] ?? true
  }

  function veldLabel(tabel, kolom, standaard) {
    return instellingen?.veld_labels?.[tabel]?.[kolom] ?? standaard
  }

  return (
    <TenantContext.Provider value={{
      tenant,
      instellingen,
      loading,
      error,
      kolomZichtbaar,
      moduleZichtbaar,
      veldLabel,
      labelProject: tenant?.label_project ?? 'project',
      labelMonteur: tenant?.label_monteur ?? 'monteur',
    }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) throw new Error('useTenant moet binnen TenantProvider gebruikt worden')
  return context
}
