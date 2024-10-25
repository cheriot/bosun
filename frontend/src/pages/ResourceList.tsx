
import { type Component } from 'solid-js';
import { useSearchParams } from "@solidjs/router";
import { KubeResourceList } from '../../wailsjs/go/desktop/FrontendApi';
import { kube } from '../../wailsjs/go/models';
import { createEffect, createResource, Show, on, For } from "solid-js"

export const ResourceList: Component = () => {

    const [searchParams, setSearchParams] = useSearchParams();

    const empty: Array<kube.ResourceTable> = []
    const [tables] = createResource(() => {
        if (searchParams.k8sctx) {
            return KubeResourceList(searchParams.k8sctx, searchParams.k8sns || "", "all")
        }
        console.log('no k8sctx in query params')
        return Promise.resolve([])
    }, { initialValue: empty })

    return (
        <div>
            <p>{searchParams.k8sctx}/{searchParams.k8sns}</p>
            <For each={tables()}>
                {(table) =>
                    <Show when={table.table?.rows.length && table.table.rows.length > 0}>
                        <p>{table.apiResource.name}</p>
                        <table class="table is-striped">
                            <thead><tr>
                                <For each={table.table?.columnDefinitions}>
                                    {(def) =>
                                        <th>{def.name}</th>
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