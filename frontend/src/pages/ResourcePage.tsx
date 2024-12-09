import type { Component } from "solid-js";
import { createEffect, createSignal, Show, on, For } from "solid-js"
import { useSearchParams, useLocation } from "@solidjs/router";
import { pathResource, ResourceQuery } from '../models/navpaths';
import { setPageTitle } from '../models/pageMeta';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';
import { fetchK8sResource } from "../models/resourceData";
import { FindText } from "../components/FindFilter";
import { relations } from "../../wailsjs/go/models";
import styles from './ResourcePage.module.css';

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

    const relationPath = (rel: relations.Reference): string => {
        if (searchParams.k8sCtx && searchParams.k8sNs) {
            let ns = rel.Namespace
            if (ns == "") {
                ns = searchParams.k8sNs
            }
            return pathResource({
                k8sCtx: searchParams.k8sCtx,
                k8sNs: ns,
                group: rel.Group,
                kind: rel.Kind,
                name: rel.Name,

            })
        } else console.error('expect k8sctx')
        return ""
    }

    const resource = fetchK8sResource(resourceQuery)

        const describeTab = 'describe'
        const yamlTab = 'yaml'
        const nsTabs = [describeTab, yamlTab]
        const [selectedTab, setSelectedTab] = createSignal(describeTab)

    return (
        <div>
            <FindText />

            <Show when={['pending', 'refreshing'].includes(resource.state)}>
                loading...
            </Show>

            <Show when={['errored'].includes(resource.state)}>
                error
            </Show>

            <Show when={resource.state == 'ready'}>
                <Show when={resource().references}>
                    Related: &nbsp;
                    <For each={resource().references}>
                        {(rel: relations.Reference, i) =>
                            <span>
                                <a href={relationPath(rel)}>
                                    {rel.Kind.toLowerCase()}
                                </a>
                                <Show when={i() != resource().references.length - 1}>
                                    ,
                                </Show>
                                &nbsp;
                            </span>
                        }
                    </For>
                </Show>

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

                <Show when={selectedTab() == describeTab}>
                    <pre>{resource().describe}</pre>
                </Show>

                <Show when={selectedTab() == yamlTab}>
                    <pre>{resource().yaml}</pre>
                </Show>
            </Show>
        </div>
    )
}