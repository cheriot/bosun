import { CtxNsQuery } from "./navpaths"

type CommandResult = CtxNsQuery & {
    query?: string
    page?: string
}

const PageNames = ['ctx', 'ns']

export const evalCommand = (cmd: string): CommandResult => {
    const parts = cmd.trim().split(' ')
    if (parts.length == 0) {
        return {}
    }

    const first = parts[0]
    if (parts.length == 1) {
        if (PageNames.includes(first)) {
            return { page: first }
        } else {
            return { query: first }
        }
    }

    const second = parts[1]
    if (first == 'ctx') {
        return { k8sCtx: second }
    }
    if (first == 'ns') {
        return { k8sNs: second }
    }

    console.error('unexpected command', cmd)
    return {}
}