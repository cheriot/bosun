
import { type Component, createEffect, createResource, Show, on, For, Accessor } from "solid-js"
import { useSearchParams, useLocation } from "@solidjs/router";
import { ResourceQuery, ResourcesQuery, pathResource } from '../models/navpaths';
import { setPageTitle } from '../models/pageMeta';

import styles from './ResourceListPage.module.css';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';
import { fetchK8sResourceTable, type TableCell } from "../models/resourceData";
import { FindFilter } from "../components/FindFilter";
import _ from "lodash";

export const ResourceListPage: Component = () => {

    const location = useLocation();
    const [searchParams] = useSearchParams();

    createEffect(() => {
        setPageTitle(searchParams.query || "", location, searchParams)
        setBreadcrumbs(new BreadcrumbBuilder(searchParams).addK8xCtx().addK8sNs().build())
    })

    if (searchParams.k8sCtx && searchParams.k8sNs && searchParams.query) {
        return (
            <div>
                <p class="is-size-3 has-text-weight-semibold mb-4">{searchParams.query}</p>
                <ResourceList
                    k8sCtx={searchParams.k8sCtx}
                    k8sNs={searchParams.k8sNs}
                    query={searchParams.query} />
            </div>
        )
    }

    console.error('insufficient props for ResourceListPage', searchParams)
    return <div>Something broke. There's not enough information to build the page.</div>
}

type ResourceListProps = ResourcesQuery

export const ResourceList: Component<ResourceListProps> = (props) => {
    const resourceQuery = (): ResourcesQuery => {
        return {
            k8sCtx: props.k8sCtx,
            k8sNs: props.k8sNs,
            query: props.query
        }
    }

    const [renderTables, { mutate }] = fetchK8sResourceTable(resourceQuery)

    const applyFilter = (s: string) => {
        const updated = renderTables().map(rt => {
            rt.rows = rt.rows.map(r => {
                r.isVisible = r.cells
                    .map(c => c.value.toString().includes(s))
                    .reduce((a, b) => a || b)
                return r
            })

            // updates require a new instance to notice properties have changed :(
            return { ...rt }
        });
        mutate(updated)

    }
    const resetFilter = () => {
        applyFilter("")
    }

    const formatApiResource = (group?: string, version?: string): string => {
        if (!group) {
            return version || ""
        }
        return `${group}/${version}`
    }

    const resourceCell = (cell: TableCell, group: string, kind: string) => {
        if (cell.isName) {
            const params: ResourceQuery = {
                k8sCtx: props.k8sCtx,
                k8sNs: props.k8sNs,
                group: group,
                kind: kind,
                name: cell.value.toString(),
                query: props.query
            }
            return <a href={pathResource(params)}>{cell.value}</a>
        }
        return cell.value
    }

    return (
        <div>
            <FindFilter applyFilter={applyFilter} removeFilter={resetFilter} />

            <For each={renderTables()}>
                {(rt) =>
                    <Show when={rt.rows.length > 0}>
                        <Show when={renderTables().length > 1}>
                            <p class="is-size-5 is-lowercase">{rt.kind} <span>{formatApiResource(rt.group, rt.version)}</span></p>
                        </Show>
                        <table class="table is-striped">
                            <thead>
                                <tr>
                                    <For each={rt.headers}>
                                        {(h) =>
                                            <th class={styles.columnHeader}>{h.value}</th>
                                        }
                                    </For>
                                </tr>
                            </thead>
                            <tbody>
                                <For each={rt.rows}>
                                    {(row) =>
                                        <Show when={row.isVisible}>
                                            <tr>
                                                <For each={row.cells}>
                                                    {(cell, i) =>
                                                        <td>
                                                            {resourceCell(cell, rt.group || "", rt.kind)}
                                                        </td>
                                                    }
                                                </For>
                                            </tr>
                                        </Show>
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