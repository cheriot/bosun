import type { Component } from "solid-js";
import { createEffect, createResource, Show, on, For } from "solid-js"
import { useSearchParams } from "@solidjs/router";
import { ResourceQuery } from '../models/navpaths';
import { KubeResource } from '../../wailsjs/go/desktop/FrontendApi';
import { kube } from '../../wailsjs/go/models';

const fetchResource = (source: ResourceQuery): Promise<kube.Resource> => {
    console.log('fetchResource', source)
    return KubeResource(source.k8sCtx, source.k8sNs, source.group, source.kind, source.name)
}
export const Resource: Component = () => {
    const [searchParams] = useSearchParams();

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
        console.log('not enough query parameters to fetch a resource', searchParams)
        return
    }

    const [resource] = createResource(
        resourceQuery,
        fetchResource,
        { initialValue: kube.Resource.createFrom({}) },
    )
    return (
        <div>
            <pre>{resource().describe}</pre>
            <p>Yaml</p>
            <pre>{resource().yaml}</pre>
        </div>
    )
}