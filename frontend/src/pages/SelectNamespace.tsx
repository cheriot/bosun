import { type Component } from 'solid-js';
import { KubeNamespaces } from '../../wailsjs/go/desktop/FrontendApi';
import { useSearchParams, useLocation } from "@solidjs/router";
import { createEffect, createResource, For } from "solid-js"
import { setPageTitle } from '../models/pageMeta';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';
import _ from 'lodash';

export const SelectNamespace: Component = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const k8sCtx = () => searchParams.k8sCtx

    createEffect(() => {
        setPageTitle('Select Namespace', location, searchParams)
        setBreadcrumbs(new BreadcrumbBuilder(searchParams).addK8xCtx().build())
    })

    const [namespaces] = createResource(() => {
        const ctx = k8sCtx()
        if (ctx) {
            return KubeNamespaces(ctx)
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