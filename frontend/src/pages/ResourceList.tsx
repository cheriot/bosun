
import { type Component } from 'solid-js';
import { useSearchParams } from "@solidjs/router";
import { KubeResourceList } from '../../wailsjs/go/desktop/FrontendApi';
import { kube } from '../../wailsjs/go/models';
import { createEffect, createResource, Show, on, For } from "solid-js"

import styles from './ResourceList.module.css';
import { CtxNsQuery, ResourcesQuery } from '../models/navpaths';


const fetchResources = (source: ResourcesQuery) => {
    if (source.k8sCtx && source.query) {
        return KubeResourceList(source.k8sCtx, source.k8sNs || "", source.query)
    }
    console.log('not enough params to list resources')
    return Promise.resolve([])
}

export const ResourceList: Component = () => {

    const [searchParams] = useSearchParams();

    const resourceQuery = () => {
        if (searchParams.k8sCtx && searchParams.k8sNs && searchParams.query) {
            return {
                k8sCtx: searchParams.k8sCtx,
                k8sNs: searchParams.k8sNs,
                query: searchParams.query
            }
        }
        return
    }
    const [tables] = createResource(
        resourceQuery,
        fetchResources,
        { initialValue: [] },
    )

    return (
        <div>
            <p>{searchParams.query}</p>
            <For each={tables()}>
                {(table) =>
                    <Show when={table.table?.rows.length && table.table.rows.length > 0}>
                        <p class="is-size-4">{table.apiResource.name}</p>
                        <table class="table is-striped">
                            <thead><tr>
                                <For each={table.table?.columnDefinitions}>
                                    {(def) =>
                                        <th class={styles.columnHeader}>{def.name}</th>
                                    }
                                </For>
                            </tr></thead>
                            <tbody>
                                <For each={table.table?.rows}>
                                    {(row) =>
                                        <tr>
                                            <For each={row.cells}>
                                                {(cell) =>
                                                    <td>{cell}</td>
                                                }
                                            </For>
                                        </tr>
                                    }
                                </For>
                            </tbody>
                        </table>
                    </Show>
                }
            </For>
            <br />
            <pre>{JSON.stringify(tables(), null, 4)}</pre>
        </div>
    )
}