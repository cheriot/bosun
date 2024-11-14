import { type Component } from 'solid-js';
import { useSearchParams, useLocation, useNavigate } from "@solidjs/router";
import { KubeContexts } from '../../wailsjs/go/desktop/FrontendApi';
import { local } from '../../wailsjs/go/models';
import { createEffect, Show, on, For } from "solid-js"
import { setPageTitle } from '../models/pageMeta';
import { setBreadcrumbs } from '../models/breadcrumbs';
import { SelectableList } from '../components/SelectableList';

export const SelectContextPage: Component = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    createEffect(() => {
        setPageTitle('Select Context', location, searchParams)
        setBreadcrumbs([])
    })

    const initState = () => {
        return KubeContexts().then(result => {
            return {
                idx: searchParams.k8sCtx ?
                    result.findIndex(r => r.Name == searchParams.k8sCtx) :
                    result.findIndex(r => r.IsActive),
                list: result.map(r => r.Name)
            }
        })
    }
    const selectPath = (k8sCtx: string) => `/namespaces?k8sCtx=${k8sCtx}`

    return (
        <SelectableList initState={initState} selectPath={selectPath}></SelectableList>
    )
}