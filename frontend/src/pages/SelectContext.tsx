import { type Component } from 'solid-js';
import { useSearchParams } from "@solidjs/router";
import { KubeContexts } from '../../wailsjs/go/desktop/FrontendApi';
import { local } from '../../wailsjs/go/models';
import { createEffect, createResource, Show, on, For } from "solid-js"
import { createCustomEvent } from '../models/pageMeta';

export const SelectContext: Component = () => {
    const [searchParams] = useSearchParams();

    createEffect(() => {
        window.parent.dispatchEvent(createCustomEvent(
            window.tabId,
            window.location,
            'Select Context',
            searchParams
        ))
    })

    const emptyTabs: Array<local.KubeContext> = []
    const [kctx, { mutate }] = createResource(() => {
        return KubeContexts()
    }, { initialValue: emptyTabs })

    const selectPath = (c: local.KubeContext) => `/namespaces?k8sCtx=${c.Name}`

    return (
        <div>
            <p>select context</p>
            <div class="menu">
                <ul class="menu-list">
                    <For each={kctx()}>
                        {(c) => <li><a href={selectPath(c)}>{c.Name}</a></li>}
                    </For>
                </ul>
            </div>
        </div>
    )
}