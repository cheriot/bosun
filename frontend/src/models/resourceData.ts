import { pathResource, ResourceQuery, ResourcesQuery } from "./navpaths"
import { createResource } from "solid-js"
import { KubeResource, KubeResourceList } from '../../wailsjs/go/desktop/FrontendApi';
import { kube, relations, v1 } from '../../wailsjs/go/models';
import _ from "lodash";

export type KubeReference = relations.Reference & {
    path: string
}
export type KubeResource = {
    describe: string;
    yaml: string;
    object: { [key: string]: any };
    errors: any[];
    references: KubeReference[]
}

export const fetchK8sResource = (query: () => ResourceQuery | undefined) => {
    const fetchResource = (source: ResourceQuery): Promise<KubeResource> => {
        return KubeResource(source.k8sCtx, source.k8sNs, source.group, source.kind, source.name)
            .then((res): KubeResource => {
                const resfsWithPath: KubeReference[] = res.references.map(ref => Object.assign(ref, {
                    path: pathResource({
                        k8sCtx: source.k8sCtx,
                        k8sNs: ref.Namespace != "" ? ref.Namespace : source.k8sNs,
                        group: ref.Group,
                        kind: ref.Kind,
                        name: ref.Name,
                    })
                }))
                return { ...res, references: resfsWithPath }
            })
    }

    const initialReferences: KubeReference[] = []
    const initialResource: kube.Resource = kube.Resource.createFrom({})
    const initialValue: KubeResource = Object.assign(initialResource, {references: initialReferences})

    const [resource] = createResource(
        query,
        fetchResource,
        { initialValue: initialValue }
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
    errorMsg?: string,
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
    if (resourceTable.isError) {
        return {
            kind: resourceTable.apiResource.kind,
            group: resourceTable.apiResource.group,
            version: resourceTable.apiResource.version,
            errorMsg: 'Unable to generate table.',
            headers: [],
            rows: [],
        }
    }

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