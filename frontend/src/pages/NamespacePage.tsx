import { type Component, createEffect, createResource, Show, on, For } from "solid-js"
import { useSearchParams, useLocation } from "@solidjs/router";
import { setPageTitle } from '../models/pageMeta';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';

const NamespacePage: Component = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    createEffect(() => {
        setPageTitle(searchParams.query || "", location, searchParams)
        setBreadcrumbs(new BreadcrumbBuilder(searchParams).addK8xCtx().build())
    })
    return <div>namespace page</div>
}