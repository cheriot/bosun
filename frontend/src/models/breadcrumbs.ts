import { createSignal } from "solid-js";
import { pathContexts, pathNamespaces, pathResources } from "./navpaths";

type Breadcrumb = { name: string, path: string }

export const [breadcrumbs, setBreadcrumbs] = createSignal<Array<Breadcrumb>>([])

export class BreadcrumbBuilder {
    private readonly searchParams: Partial<Record<string, string>>
    private breadcrumbs: Array<Breadcrumb>

    constructor(searchParams: Record<string, any>) {
        this.searchParams = searchParams
        this.breadcrumbs = []
    }

    addK8xCtx() {
        if (this.searchParams.k8sCtx) {
            const linkParams: Record<string, string> = { k8sCtx: this.searchParams.k8sCtx }
            if (this.searchParams.k8sNs) {
                linkParams.k8sNs = this.searchParams.k8sNs
            }
            this.breadcrumbs.push({
                name: this.searchParams.k8sCtx,
                path: pathContexts(linkParams)
            })
        } else console.error('no k8sCtx in', this.searchParams)

        return this
    }

    addK8sNs() {
        if (this.searchParams.k8sCtx && this.searchParams.k8sNs) {
            this.breadcrumbs.push({
                name: this.searchParams.k8sNs,
                path: pathNamespaces({ k8sCtx: this.searchParams.k8sCtx, k8sNs: this.searchParams.k8sNs })
            })
        }

        return this
    }

    addQuery() {
        if (this.searchParams.k8sCtx && this.searchParams.k8sNs && this.searchParams.query && this.searchParams.name) {
            this.breadcrumbs.push({
                name: this.searchParams.query,
                path: pathResources({
                    k8sCtx: this.searchParams.k8sCtx,
                    k8sNs: this.searchParams.k8sNs,
                    query: this.searchParams.query
                })
            })
        }

        return this
    }

    build() {
        return this.breadcrumbs
    }
}