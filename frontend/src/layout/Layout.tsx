import { type Component, ParentProps, splitProps } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { CtxNsQuery, pathContexts, pathNamespaces, pathResources } from "../models/navpaths";
import { createEffect, createResource, Show, on, For } from "solid-js"

import styles from './Layout.module.css'
import { currentKeyboardCmd, KeyboardCmd, setMatchers } from "../models/keyboardCmd";

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

    let commandInput: HTMLInputElement | undefined

    setMatchers([
        { cmd: KeyboardCmd.FocusCommand, match: { code: 'Semicolon', metaKey: false, shiftKey: true } },
    ])

    createEffect(on(currentKeyboardCmd, (keyboardCmd) => {
        switch (keyboardCmd) {
            case KeyboardCmd.FocusCommand:
                commandInput?.focus()
                break;
            default:
                throw new Error('unknown keyboard cmd ' + keyboardCmd)
        }
    }, { defer: true }))

    return (
        <>
            <div class={`section pb-5 ${styles.navSection}`}>
                <div class="columns is-vcentered">
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
                        <input class={`input ${styles.queryInput}`}
                            ref={commandInput}
                            type="text"
                            placeholder="all, pods, services"
                            onchange={onchange}></input>
                    </div>
                </div>
            </div>
            <div class={`section ${styles.pageBody}`}>{props.children}</div>
        </>
    )
}

export { Layout }