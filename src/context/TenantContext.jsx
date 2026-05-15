import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const TenantContext = createContext(null)

export function TenantProvider({ children }) {
  const { user } = useAuth()
  const [tenant, setTenant] = useState(null)
  const [instellingen, setInstellingen] = useState(null)
  const [loading, setLoading] = useState(true)

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
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .single()
        if (tenantError) throw tenantError
        setTenant(tenantData)

        const { data: instellingenData, error: instellingenError } = await supabase
          .from('tenant_instellingen')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .single()
        if (instellingenError) throw instellingenError
        setInstellingen(instellingenData)
      } catch (error) {
        console.error('Fout bij laden tenant:', error)
      } finally {
        setLoading(false)
      }
    }

    laadTenant()
  }, [user])

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
