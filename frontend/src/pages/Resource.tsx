import { Component } from "solid-js";
import { useSearchParams } from "@solidjs/router";

export const Resource: Component = () => {
    const [searchParams] = useSearchParams();
    return (
        <div>Resource page: <pre>{JSON.stringify(searchParams, null, 4)}</pre></div>
    )
}