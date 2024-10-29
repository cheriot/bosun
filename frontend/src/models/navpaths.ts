
export type CtxNsQuery = { k8sCtx?: string, k8sNs?: string }

export const pathContexts = (params: CtxNsQuery) =>
    `/${toQueryString(params)}`

export const pathNamespaces = (params: CtxNsQuery) =>
    `/namespaces${toQueryString(params)}`

export type ResourcesQuery = CtxNsQuery & {
    query: string
}
export const pathResources = (params: ResourcesQuery) =>
    `/resources${toQueryString(params)}`

const toQueryString = (params: Record<string, string>) => {
    const serialized = new URLSearchParams(params).toString()
    if (serialized != '') {
        return `?${serialized}`
    }
    return ''
}

const example = () => {
    pathContexts({ k8sCtx: 'foo' })
}