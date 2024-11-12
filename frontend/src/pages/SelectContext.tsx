import { type Component } from 'solid-js';
import { useSearchParams, useLocation } from "@solidjs/router";
import { KubeContexts } from '../../wailsjs/go/desktop/FrontendApi';
import { local } from '../../wailsjs/go/models';
import { createEffect, createResource, Show, on, For } from "solid-js"
import { setPageTitle } from '../models/pageMeta';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';

export const SelectContext: Component = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    createEffect(() => {
        setPageTitle('Select Context', location, searchParams)
        setBreadcrumbs(new BreadcrumbBuilder(searchParams).addK8xCtx().build())
    })

    const emptyTabs: Array<local.KubeContext> = []
    const [kctx] = createResource(() => {
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