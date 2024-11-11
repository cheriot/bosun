import type { Component } from "solid-js";
import { createEffect, createResource, Show, on, For } from "solid-js"
import { useSearchParams, useLocation } from "@solidjs/router";
import { ResourceQuery } from '../models/navpaths';
import { KubeResource } from '../../wailsjs/go/desktop/FrontendApi';
import { kube } from '../../wailsjs/go/models';
import { setPageTitle } from '../models/pageMeta';

const fetchResource = (source: ResourceQuery): Promise<kube.Resource> => {
    return KubeResource(source.k8sCtx, source.k8sNs, source.group, source.kind, source.name)
}

export const Resource: Component = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    createEffect(() => {
        setPageTitle(searchParams.name || "", location, searchParams)
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

    const [resource] = createResource(
        resourceQuery,
        fetchResource,
        { initialValue: kube.Resource.createFrom({}) },
    )
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