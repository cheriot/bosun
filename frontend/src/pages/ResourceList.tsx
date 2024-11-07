
import { type Component } from 'solid-js';
import { useSearchParams, useLocation } from "@solidjs/router";
import { KubeResourceList } from '../../wailsjs/go/desktop/FrontendApi';
import { kube } from '../../wailsjs/go/models';
import { createEffect, createResource, Show, on, For } from "solid-js"
import { ResourcesQuery, pathResource } from '../models/navpaths';
import { createCustomEvent } from '../models/pageMeta';

import styles from './ResourceList.module.css';

const fetchResources = (source: ResourcesQuery) => {
    return KubeResourceList(source.k8sCtx, source.k8sNs || "", source.query)
}

export const ResourceList: Component = () => {

    const location = useLocation();
    const [searchParams] = useSearchParams();

    createEffect(() => {
        console.log('ResourceList', location.pathname, location.search)
        window.parent.dispatchEvent(createCustomEvent(
            window.tabId,
            location,
            searchParams.query || "",
            searchParams
        ))
    })

    const resourceQuery = (): ResourcesQuery | undefined => {
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

    const formatApiResource = (apiResource: { group?: string, version?: string }): string => {
        if (!apiResource.group) {
            return apiResource.version || ""
        }
        return `${apiResource.group}/${apiResource.version}`
    }

    const resourceCell = (cell: string, idx: number, tableRowNames: Array<string>, group: string, kind: string) => {
        if (idx == 0 && searchParams.k8sCtx && searchParams.k8sNs) {
            const params = {
                k8sCtx: searchParams.k8sCtx,
                k8sNs: searchParams.k8sNs,
                group: group,
                kind: kind,
                name: tableRowNames[idx],
            }
            return <a href={pathResource(params)}>{cell}</a>
        }
        return cell
    }

    return (
        <div>
            <p class="is-size-3 has-text-weight-semibold mb-4">{searchParams.query}</p>
            <For each={tables()}>
                {(table) =>
                    <Show when={table.table?.rows.length && table.table.rows.length > 0}>
                        <p class="is-size-5">{table.apiResource.name} <span>{formatApiResource(table.apiResource)}</span></p>
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
                                                {(cell, i) =>
                                                    <td>
                                                        {resourceCell(cell, i(), table.tableRowNames, table.apiResource.group || "", table.apiResource.kind)}
                                                    </td>
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
        </div>
    )
}