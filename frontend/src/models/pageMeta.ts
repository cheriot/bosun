// Set the page title and other meta data used by tabs and navigation.

import { CtxNsQuery } from "./navpaths"
import { type Location } from "@solidjs/router";

const EventName = "pageMetaCmd"

type PageMeta = CtxNsQuery & {
    id: string
    path: string
    title: string
}

const setPageTitle = (title: string, location: Location, searchParams: CtxNsQuery) => {
    if (window.tabId && window.top) {
        const pageMeta = {
            k8sCtx: searchParams.k8sCtx,
            k8sNs: searchParams.k8sNs,
            id: window.tabId,
            path: location.pathname + location.search,
            title: title,
        }
        window.top.dispatchEvent(createCustomEvent(pageMeta))
    } else {
        console.error('setting state without tabId', window.tabId, !!window.top)
    }
}

const createCustomEvent = (pageMeta: PageMeta): CustomEvent =>
    new CustomEvent(EventName, { detail: pageMeta })

const detailFromCustomEvent = (e: CustomEvent): PageMeta =>
    e.detail

export { EventName, setPageTitle, detailFromCustomEvent }

declare global {
    interface Window {
        tabId: string | undefined
    }
}
