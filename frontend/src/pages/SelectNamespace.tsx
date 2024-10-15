import { type Component } from 'solid-js';
import { useSearchParams } from "@solidjs/router";

export const SelectNamespace: Component = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    return (
        <div>
            <p>list namespaces from {searchParams.k8sctx}</p>
        </div>
    )
}