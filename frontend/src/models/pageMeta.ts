// Set the page title and other meta data used by tabs and navigation.

import { CtxNsQuery } from "./navpaths"
import { type Location } from "@solidjs/router";

const EventName = "pageMetaCmd"

type PageMeta = CtxNsQuery & {
    id: string
    path: string
    title: string
}

const createCustomEvent = (id: string, location: Location, title: string, searchParams: CtxNsQuery): CustomEvent => {
    const pageMeta: PageMeta = {
        k8sCtx: searchParams.k8sCtx,
        k8sNs: searchParams.k8sNs,
        id: id,
        path: location.pathname + location.search,
        title: title,
    }

    return new CustomEvent(EventName, { detail: pageMeta })
}

const detailFromCustomEvent = (e: CustomEvent): PageMeta =>
    e.detail

export { EventName, createCustomEvent, detailFromCustomEvent }