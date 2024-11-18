import { ResourceQuery, ResourcesQuery } from "./navpaths"
import { createResource } from "solid-js"
import { KubeResource, KubeResourceList } from '../../wailsjs/go/desktop/FrontendApi';
import { kube, v1 } from '../../wailsjs/go/models';
import _ from "lodash";

export const fetchK8sResource = (query: () => ResourceQuery | undefined) => {
    const fetchResource = (source: ResourceQuery): Promise<kube.Resource> => {
        return KubeResource(source.k8sCtx, source.k8sNs, source.group, source.kind, source.name)
    }

    const [resource] = createResource(
        query,
        fetchResource,
        { initialValue: kube.Resource.createFrom({}) },
    )

    return resource
}

export type TableCell = {
    value: string | number,
    isName: boolean,
}
export type TableRow = {
    cells: TableCell[]
    isVisible: boolean
    rowIdx?: number // index among all RenderTables on the page
    name: string
}
export type RenderTable = {
    kind: string,
    group?: string,
    version?: string,
    // In both headers and rows, undefined is a placeholder for name,
    // which will be rendered differently.
    headers: TableCell[],
    rows: TableRow[],
}

export const fetchK8sResourceTable = (query: () => ResourcesQuery | undefined) => {
    const fetchResources = (source: ResourcesQuery) => {
        return KubeResourceList(source.k8sCtx, source.k8sNs || "", source.query)
            .then(resourceTables => {
                const renderTables = []
                let rowNum = 0
                for (let rt of resourceTables) {
                    if (rt.table) {
                        const renderTable = buildRenderTable(rt)
                        renderTable.rows.forEach(r => {
                            r.isVisible = true
                            r.rowIdx = rowNum++
                        })
                        renderTables.push(renderTable)
                    }
                }
                return renderTables
            })
    }

    return createResource(
        query,
        fetchResources,
        { initialValue: [] },
    )
}

const buildRenderTable = (resourceTable: kube.ResourceTable): RenderTable => {
    const table = resourceTable.table as v1.Table
    const headers = table.columnDefinitions.map(h => { return { value: h.name, isName: false } })
    if (headers[0].value.toLowerCase() != "name") console.error('expected the name in column one', resourceTable)
    headers[0].isName = true

    const rows = new Array<TableRow>()
    const rowCount = table.rows.length
    for (let i = 0; i < rowCount; i++) {
        const name = resourceTable.tableRowNames[i]
        const values = table.rows[i].cells.map(c => { return { value: c, isName: false } })
        // anecdotally the first column is always the name, but even if not make sure the value works
        // in the link
        values[0].isName = true
        values[0].value = name
        rows[i] = {
            cells: values,
            isVisible: true,
            name: name,
        }
    }

    return {
        kind: resourceTable.apiResource.kind,
        group: resourceTable.apiResource.group,
        version: resourceTable.apiResource.version,
        headers: headers,
        rows: rows,
    }
}