import { useSuspenseQuery, UseSuspenseQueryOptions } from '@tanstack/react-query'

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import type {
  ActionType,
  ExtractTables,
  SelectableColumns,
  SelectedData,
} from '../types'
import { dbQuery, dbMutation } from './ helpers'


// Export centralisé de tous les hooks et helpers
export { dbQuery, dbMutation } from './ helpers'

export type {
  ActionType,
  ExtractTables,
  OrderClause,
  SelectableColumns,
  SelectedData,
  UpdateWhereClause,
  WhereClause,
} from '../types'

// Hooks CRUD stylés
export function useRecords<TFrom extends keyof ExtractTables, TSelect extends SelectableColumns<TFrom>, TData = SelectedData<TSelect, TFrom>>(
  options: Parameters<typeof dbQuery<TFrom, TSelect, TData>>[0],
  queryOptions?: UseQueryOptions<{ success: boolean, data: TData[], meta?: any, error?: string }>
) {
  const { queryKey, queryFn } = dbQuery<TFrom, TSelect, TData>(options)
  return useQuery({
    queryKey,
    queryFn,
    ...queryOptions
  })
}
export const useDbQuery = useRecords

export function useRecordAction<TAction extends ActionType, TTable extends keyof ExtractTables>(
  options: Parameters<typeof dbMutation<TAction, TTable>>[0],
  mutationOptions?: UseMutationOptions<{ success: boolean, data?: any, error?: string }, Error, any>
) {
  const { mutationKey, mutationFn } = dbMutation<TAction, TTable>(options)
  return useMutation({
    mutationKey,
    mutationFn,
    ...mutationOptions
  })
}
export const useDbMutation = useRecordAction

export function useRecordsSuspense<TFrom extends keyof ExtractTables, TSelect extends SelectableColumns<TFrom>, TData = SelectedData<TSelect, TFrom>>(
  options: Parameters<typeof dbQuery<TFrom, TSelect, TData>>[0],
  queryOptions?: UseSuspenseQueryOptions<{ success: boolean, data: TData[], meta?: any, error?: string }>
) {
  const { queryKey, queryFn } = dbQuery<TFrom, TSelect, TData>(options)
  return useSuspenseQuery({
    queryKey,
    queryFn,
    ...queryOptions
  })
}

// Hooks explicites par verbe HTTP
export function useGet<TFrom extends keyof ExtractTables, TSelect extends SelectableColumns<TFrom>, TData = SelectedData<TSelect, TFrom>>(
  options: Parameters<typeof dbQuery<TFrom, TSelect, TData>>[0],
  queryOptions?: UseQueryOptions<{ success: boolean, data: TData[], meta?: any, error?: string }>
) {
  const { queryKey, queryFn } = dbQuery<TFrom, TSelect, TData>(options)
  return useQuery({
    queryKey,
    queryFn,
    ...queryOptions
  })
}

export function usePost<TTable extends keyof ExtractTables>(
  options: { table: TTable },
  mutationOptions?: UseMutationOptions<{ success: boolean, data?: any, error?: string }, Error, ExtractTables[TTable]['$inferInsert']>
) {
  const { mutationKey, mutationFn } = dbMutation({ action: 'insert', table: options.table })
  return useMutation({
    mutationKey,
    mutationFn,
    ...mutationOptions
  })
}

export function usePut<TTable extends keyof ExtractTables>(
  options: { table: TTable },
  mutationOptions?: UseMutationOptions<{ success: boolean, data?: any, error?: string }, Error, { where: any, data: Partial<ExtractTables[TTable]['$inferInsert']> }>
) {
  const { mutationKey, mutationFn } = dbMutation({ action: 'update', table: options.table })
  return useMutation({
    mutationKey,
    mutationFn,
    ...mutationOptions
  })
}

export function usePatch<TTable extends keyof ExtractTables>(
  options: { table: TTable },
  mutationOptions?: UseMutationOptions<{ success: boolean, data?: any, error?: string }, Error, { where: any, data: Partial<ExtractTables[TTable]['$inferInsert']> }>
) {
  const { mutationKey, mutationFn } = dbMutation({ action: 'update', table: options.table })
  return useMutation({
    mutationKey,
    mutationFn,
    ...mutationOptions
  })
}

export function useDelete<TTable extends keyof ExtractTables>(
  options: { table: TTable },
  mutationOptions?: UseMutationOptions<{ success: boolean, data?: any, error?: string }, Error, any>
) {
  const { mutationKey, mutationFn } = dbMutation({ action: 'delete', table: options.table })
  return useMutation({
    mutationKey,
    mutationFn,
    ...mutationOptions
  })
}

