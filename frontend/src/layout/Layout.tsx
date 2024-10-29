import { type Component, ParentProps, splitProps } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { CtxNsQuery, pathContexts, pathNamespaces, pathResources } from "../models/navpaths";
import { createEffect, createResource, Show, on, For } from "solid-js"

const Layout: Component = (props: ParentProps) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    let breadcrumbs = (): Array<{ name: string, path: string }> => {
        const entries = []
        if (searchParams.k8sCtx) {
            entries.push({
                name: searchParams.k8sCtx,
                path: pathContexts(searchParams)
            })
        }
        if (searchParams.k8sNs) {
            entries.push({
                name: searchParams.k8sNs,
                path: pathNamespaces(searchParams)
            })
        }

        return entries
    }

    const onchange = (e: Event) => {
        if (e.target && e.target instanceof HTMLInputElement) {
            const path = pathResources({
                k8sCtx: searchParams.k8sCtx,
                k8sNs: searchParams.k8sNs,
                query: e.target.value
            })
            navigate(path)
            e.target.value = ''
        }
        e.preventDefault()
    }

    return (
        <>
            <div class="columns">
                <div class='column is-narrow'>
                    <nav class="breadcrumb" aria-label="breadcrumbs">
                        <ul>
                            <For each={breadcrumbs()}>
                                {(b) =>
                                    <li><a href={b.path}>{b.name}</a></li>
                                }
                            </For>
                        </ul>
                    </nav>
                </div>
                <div class='column'>
                    <input class="input"
                        type="text"
                        placeholder="all, pods, services"
                        onchange={onchange}></input>
                </div>
            </div>
            <div>{props.children}</div>
        </>
    )
}

export { Layout }