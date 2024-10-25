
import { type Component } from 'solid-js';
import { useSearchParams } from "@solidjs/router";

export const ResourceList: Component = () => {

    const [searchParams, setSearchParams] = useSearchParams();

    return (
        <p>ResourceList for {searchParams.k8sctx}/{searchParams.k8sns}</p>
    )
}