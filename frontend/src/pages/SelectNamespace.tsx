import { type Component } from 'solid-js';
import { KubeNamespaces } from '../../wailsjs/go/desktop/FrontendApi';
import { useSearchParams } from "@solidjs/router";
import { createResource, For } from "solid-js"

export const SelectNamespace: Component = () => {
    const [searchParams] = useSearchParams();

    const [namespaces] = createResource(() => {
        if (searchParams.k8sCtx) {
            return KubeNamespaces(searchParams.k8sCtx)
        }
        console.log('no k8sCtx in query params')
        return Promise.resolve([])
    }, { initialValue: [] })

    const resourcesPath = (ns: string) => `/resources?k8sCtx=${searchParams.k8sCtx}&k8sNs=${ns}&query=all`
    return (
        <div>
            <p>namespaces from {searchParams.k8sCtx}</p>
            <div class="menu">
                <ul class="menu-list">
                    <For each={namespaces()}>
                        {(ns) => <li><a href={resourcesPath(ns)}>{ns}</a></li>}
                    </For>
                </ul>
            </div>
        </div>
    )
}