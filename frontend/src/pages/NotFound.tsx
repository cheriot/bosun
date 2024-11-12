import { type Component, createEffect } from "solid-js"
import { useSearchParams, useLocation } from "@solidjs/router";
import { setPageTitle } from '../models/pageMeta';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';


export const NotFound: Component = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    createEffect(() => {
        setPageTitle('Not Found', location, searchParams)
        setBreadcrumbs(new BreadcrumbBuilder(searchParams).addK8xCtx().addK8sNs().build())
    })
    return (
        <div>page not found {window.location.pathname}</div>
    )
}