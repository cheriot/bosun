import { type Component } from 'solid-js';
import { KubeNamespaces } from '../../wailsjs/go/desktop/FrontendApi';
import { local } from '../../wailsjs/go/models';
import { useSearchParams } from "@solidjs/router";
import { createEffect, createResource, Show, on, For } from "solid-js"

export const SelectNamespace: Component = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const emptyTabs: Array<string> = []
    const [namespaces, { mutate }] = createResource(() => {
        if (searchParams.k8sctx) {
            return KubeNamespaces(searchParams.k8sctx)
        }
        console.log('no k8sctx in query params')
        return Promise.resolve([])
    }, { initialValue: emptyTabs })

    return (
        <div>
            <p>list namespaces from {searchParams.k8sctx}</p>
            <p>{JSON.stringify(namespaces())}</p>
        </div>
    )
}