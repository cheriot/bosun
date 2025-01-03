
import { type Component, createEffect, createResource, Show, on, For, Accessor, createSignal, onCleanup } from "solid-js"
import { useSearchParams, useLocation, useNavigate } from "@solidjs/router";
import { ResourceQuery, ResourcesQuery, pathResource } from '../models/navpaths';
import { setPageTitle } from '../models/pageMeta';

import styles from './ResourceListPage.module.css';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';
import { fetchK8sResourceTable, RenderTable, TableRow, type TableCell } from "../models/resourceData";
import { FindFilter } from "../components/FindFilter";
import _ from "lodash";
import { addKeyboardCmdListener, KeyboardCmd, removeKeyboardCmdListener } from "../models/keyboardCmd";
import { makeSelectable } from "../components/SelectableList";

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
    const navigate = useNavigate()

    // Data to display
    const resourceQuery = (): ResourcesQuery => {
        return {
            k8sCtx: props.k8sCtx,
            k8sNs: props.k8sNs,
            query: props.query
        }
    }
    const [renderTables, { mutate: mutateRenderTables }] = fetchK8sResourceTable(resourceQuery)

    // Keyboard movement j,k,enter
    const listLength = (): number => {
        return renderTables().reduce((sum: number, rt: RenderTable) =>
            sum + rt.rows.filter(r => r.isVisible).length
            , 0)
    }
    const navToIdx = (i: number) => {
        let foundTable: RenderTable | undefined
        let foundRow: TableRow | undefined
        renderTables().forEach((rt: RenderTable) => {
            rt.rows.forEach((r => {
                if (r.rowIdx == i) {
                    foundTable = rt
                    foundRow = r
                }
            }))
        })

        if (foundTable && foundRow) {
            const params: ResourceQuery = {
                k8sCtx: props.k8sCtx,
                k8sNs: props.k8sNs,
                group: foundTable.group || "",
                kind: foundTable.kind,
                name: foundRow.name,
                query: props.query
            }
            navigate(pathResource(params))
        } else console.error('tried to select an idx that does not exist', i)
    }
    const [highlightIdx] = makeSelectable(listLength, navToIdx)

    // Filter funcs
    const applyFilter = (s: string) => {
        let rowNum = 0
        const updated = renderTables().map(rt => {
            rt.rows = rt.rows.map(r => {
                r.isVisible = r.cells
                    .map(c => c.value.toString().includes(s))
                    .reduce((a, b) => a || b)
                if (r.isVisible) r.rowIdx = rowNum++
                else r.rowIdx = undefined
                return r
            })

            // updates require a new instance to notice properties have changed :(
            return { ...rt }
        });
        mutateRenderTables(updated)

    }
    const resetFilter = () => {
        applyFilter("")
    }

    // View funcs
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

    const isEmpty = () => {
        if (renderTables && renderTables.state == "ready") {
            const total = renderTables().map((rt) => rt.rows.length).reduce((sum, l) => sum + l)
            return total == 0
        }
        return false
    }

    return (
        <div>
            <FindFilter applyFilter={applyFilter} removeFilter={resetFilter} />

            <Show when={['pending', 'refreshing'].includes(renderTables.state)}>
                loading...
            </Show>

            <Show when={['errored'].includes(renderTables.state)}>
                error
            </Show>

            <Show when={isEmpty()}>
                empty
            </Show>

            <For each={renderTables()}>
                {(rt) =>
                    <div>
                        <Show when={rt.errorMsg || rt.rows.length > 0}>
                            <p class="is-size-5 is-lowercase">{rt.kind} <span>{formatApiResource(rt.group, rt.version)}</span></p>
                        </Show>

                        <Show when={rt.errorMsg}>
                            <p>{rt.errorMsg}</p>
                        </Show>

                        <Show when={rt.rows.length > 0}>
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
                                                <tr classList={{
                                                     'is-link': highlightIdx() == row.rowIdx,
                                                     [styles.isLink]: highlightIdx() == row.rowIdx

                                                }}>
                                                    <For each={row.cells}>
                                                        {(cell) =>
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
                    </div>
                }
            </For>

            <br />
            <pre>{JSON.stringify(renderTables(), null, 4)}</pre>
        </div>
    )
}