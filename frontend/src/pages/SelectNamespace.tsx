import { type Component } from 'solid-js';
import { KubeNamespaces } from '../../wailsjs/go/desktop/FrontendApi';
import { useSearchParams } from "@solidjs/router";
import { createResource, For } from "solid-js"
import { createCustomEvent } from '../models/pageMeta';

export const SelectNamespace: Component = () => {
    const [searchParams] = useSearchParams();
    const k8sCtx = () => searchParams.k8sCtx

    createEffect(() => {
        window.parent.dispatchEvent(createCustomEvent(
            window.tabId,
            window.location,
            'Select Namespace',
            searchParams
        ))
    })

    const [namespaces] = createResource(() => {
        const c = k8sCtx()
        if (c) {
            return KubeNamespaces(c)
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