
export type CtxNsQuery = { k8sCtx?: string, k8sNs?: string }

export const pathContexts = (params: CtxNsQuery) =>
    `/${toQueryString(params)}`

export const pathNamespaces = (params: CtxNsQuery) =>
    `/namespaces${toQueryString(params)}`

export type ClusterQuery = { k8sCtx: string, k8sNs: string }

export type ResourcesQuery = ClusterQuery & {
    query: string
}
export const pathResources = (params: ResourcesQuery) =>
    `/resources${toQueryString(params)}`

export type ResourceQuery = ClusterQuery & {
    query?: string // parent resource list for nav hierarchy
    group: string
    kind: string
    name: string
}
export const pathResource = (params: ResourceQuery) =>
    `/resource${toQueryString(params)}`

const toQueryString = (params: Record<string, string>) => {
    const serialized = new URLSearchParams(params).toString()
    if (serialized != '') {
        return `?${serialized}`
    }
    return ''
}