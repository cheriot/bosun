import { type Component } from 'solid-js';
import { KubeNamespaces } from '../../wailsjs/go/desktop/FrontendApi';
import { useSearchParams, useLocation } from "@solidjs/router";
import { createEffect, createResource, For } from "solid-js"
import { setPageTitle } from '../models/pageMeta';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';
import _ from 'lodash';
import { SelectableList } from '../components/SelectableList';

export const SelectNamespacePage: Component = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    createEffect(() => {
        setPageTitle('Select Namespace', location, searchParams)
        setBreadcrumbs(new BreadcrumbBuilder(searchParams).addK8xCtx().build())
    })

    const resourcesPath = (ns: string) => `/resources?k8sCtx=${searchParams.k8sCtx}&k8sNs=${ns}&query=all`

    const initState = () => {
        if (searchParams.k8sCtx) {
            return KubeNamespaces(searchParams.k8sCtx).then(result => {
                return {
                    idx: searchParams.k8sNs ? result.findIndex(r => r == searchParams.k8sNs) : 0,
                    list: result
                }
            })
        }

        console.error('no k8sCtx in query params')
        return Promise.resolve({ idx: 0, list: [] })
    }
    return (
        <div>
            <p>namespaces from {searchParams.k8sCtx}</p>
            <SelectableList initState={initState} selectPath={resourcesPath}></SelectableList>
        </div>
    )
}