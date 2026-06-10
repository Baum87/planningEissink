import { useQuery } from '@tanstack/react-query'
import { getMonteurs, getGroepen } from '../services/monteursService'
import { getToewijzingen } from '../services/toewijzingenService'
import { getProjecten } from '../services/projectenService'
import { getPeriodes } from '../services/periodesService'
import { getProfielen } from '../services/gebruikersbeheerService'
import { getExpertises } from '../services/expertisesService'

export const useProjecten = (opties = {}) =>
  useQuery({
    queryKey: ['projecten', opties],
    queryFn: () => getProjecten(opties),
  })

export const useProfielen = () =>
  useQuery({
    queryKey: ['profielen'],
    queryFn: getProfielen,
  })

export const useMonteurs = (opties = {}) =>
  useQuery({
    queryKey: ['monteurs', opties],
    queryFn: () => getMonteurs(opties),
  })

export const useGroepen = () =>
  useQuery({
    queryKey: ['groepen'],
    queryFn: getGroepen,
  })

export const useExpertises = () =>
  useQuery({
    queryKey: ['expertises'],
    queryFn: getExpertises,
  })

export const usePeriodes = () =>
  useQuery({
    queryKey: ['periodes'],
    queryFn: getPeriodes,
  })

// refetchInterval: toewijzingen worden elke 60 seconden stil ververst
// zodat projectleiders die passief meekijken actuele data zien.
// Verwijderen zodra Supabase Realtime wordt geïmplementeerd.
export const useToewijzingen = (van, tot) =>
  useQuery({
    queryKey: ['toewijzingen', van, tot],
    queryFn: () => getToewijzingen(van, tot),
    refetchInterval: 60_000,
  })
