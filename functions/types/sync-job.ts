export type SyncJobSuccess<
  TData = undefined,
  TExtra extends object = {},
> = (TData extends undefined ? { result: 'SUCCESS' } : { result: 'SUCCESS'; data: TData }) &
  TExtra

export interface SyncJobFailure<TError = unknown> {
  error: TError
  result: 'FAILURE'
}

export type SyncJobResult<
  TData = undefined,
  TExtra extends object = {},
  TError = unknown,
> = SyncJobSuccess<TData, TExtra> | SyncJobFailure<TError>
