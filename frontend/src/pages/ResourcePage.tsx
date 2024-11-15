import type { Component } from "solid-js";
import { createEffect, createResource, Show, on, For } from "solid-js"
import { useSearchParams, useLocation } from "@solidjs/router";
import { ResourceQuery } from '../models/navpaths';
import { setPageTitle } from '../models/pageMeta';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';
import { fetchK8sResource } from "../models/resourceData";

export const ResourcePage: Component = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    createEffect(() => {
        setPageTitle(searchParams.name || "", location, searchParams)
        setBreadcrumbs(new BreadcrumbBuilder(searchParams).addK8xCtx().addK8sNs().addQuery().build())
    })

    const resourceQuery = (): ResourceQuery | undefined => {
        if (searchParams.k8sCtx && searchParams.k8sNs && searchParams.kind && searchParams.name) {
            return {
                k8sCtx: searchParams.k8sCtx,
                k8sNs: searchParams.k8sNs,
                group: searchParams.group || "",
                kind: searchParams.kind,
                name: searchParams.name
            }
        }
        console.error('not enough query parameters to fetch a resource', searchParams)
        return
    }

    const resource = fetchK8sResource(resourceQuery)

    return (
        <div>
            <Show when={resource().yaml} fallback={`Unable to find ${searchParams.kind} ${searchParams.name} in ${searchParams.k8sNs} namespace.`}>
                <pre>{resource().describe}</pre>
                <br />
                <br />
                <pre>{resource().yaml}</pre>
            </Show>
        </div>
    )
}