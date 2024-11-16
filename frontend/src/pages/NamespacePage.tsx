import { type Component, createEffect, createResource, Show, on, For, createSignal } from "solid-js"
import { useSearchParams, useLocation } from "@solidjs/router";
import { setPageTitle } from '../models/pageMeta';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';
import { ResourceList } from "./ResourceListPage";
import { fetchK8sResource } from "../models/resourceData";
import { ResourceQuery } from "../models/navpaths";

export const NamespacePage: Component = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    createEffect(() => {
        setPageTitle(searchParams.query || "", location, searchParams)
        setBreadcrumbs(new BreadcrumbBuilder(searchParams).addK8xCtx().build())
    })

    if (searchParams.k8sCtx && searchParams.k8sNs) {
        const resourceTab = 'resources'
        const describeTab = 'describe'
        const yamlTab = 'yaml'
        const nsTabs = [resourceTab, describeTab, yamlTab]
        const [selectedTab, setSelectedTab] = createSignal(resourceTab)

        const resourceQuery: ResourceQuery = {
            k8sCtx: searchParams.k8sCtx,
            k8sNs: searchParams.k8sNs,
            group: "",
            kind: "Namespace",
            name: searchParams.k8sNs,
        }

        const resource = fetchK8sResource(() => resourceQuery)

        return (
            <div>
                <p class="is-size-3 has-text-weight-semibold mb-4">{searchParams.k8sNs}</p>
                <div class="tabs">
                    <ul>
                        <For each={nsTabs}>
                            {(t) =>
                                <li classList={{ "is-active": t == selectedTab() }}>
                                    <a onclick={() => setSelectedTab(t)}>{t}</a>
                                </li>
                            }
                        </For>
                    </ul>
                </div>

                <Show when={selectedTab() == resourceTab}>
                    <ResourceList
                        k8sCtx={searchParams.k8sCtx}
                        k8sNs={searchParams.k8sNs}
                        query={'all'} />
                </Show>

                <Show when={selectedTab() == describeTab}>
                    <pre>{resource().describe}</pre>
                </Show>

                <Show when={selectedTab() == yamlTab}>
                    <pre>{resource().yaml}</pre>
                </Show>
            </div>
        )
    }

    console.error('insufficient props for ResourceListPage', searchParams)
    return (
        <div>
            Something broke. There's not enough information to build the page.
            <pre>{JSON.stringify(searchParams, null, 4)}</pre>
        </div>
    )
}