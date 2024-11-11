import { type Component, ParentProps, splitProps } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { CtxNsQuery, pathContexts, pathNamespaces, pathResources } from "../models/navpaths";
import { createEffect, Show, on, For } from "solid-js"

import styles from './Layout.module.css'
import { currentKeyboardCmd, KeyboardCmd, setMatchers } from "../models/keyboardCmd";
import { evalCommand } from "../models/command";
import _ from "lodash";

const Layout: Component = (props: ParentProps) => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

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
        if (e.target && e.target instanceof HTMLInputElement && searchParams.k8sCtx) {
            const params = evalCommand(e.target.value)
            if (params.k8sCtx) {
                if (searchParams.k8sCtx) {
                    setSearchParams({ k8sCtx: params.k8sCtx })
                } else {
                    // nav to ns page
                    navigate(pathNamespaces(_.assign(params, searchParams)))
                }
            } else if (params.k8sNs) {
                if (searchParams.k8sNs) {
                    setSearchParams({ k8sNs: params.k8sNs })
                } else {
                    // nav to all
                    navigate(pathResources({
                        k8sCtx: searchParams.k8sCtx,
                        k8sNs: params.k8sNs,
                        query: searchParams.query || 'all'
                    }))
                }
            } else if (params.query) {
                // nav to query
                // TODO handle cases where k8sCtx or k8sNs are undefined
                navigate(pathResources({
                    k8sCtx: searchParams.k8sCtx,
                    k8sNs: searchParams.k8sNs,
                    query: e.target.value
                }))
            } else if (params.page) {
                if (params.page == 'ctx') {
                    navigate(pathContexts(searchParams))
                } else if (params.page == 'ns') {
                    navigate(pathNamespaces(searchParams))
                } else console.error('unknown page', params)
            } else {
                // do nothing
                console.error('no params from cmd', e.target.value)
            }

            e.target.value = ''
            e.target.blur()
        } else console.error('unexpected event')
        e.preventDefault()
    }

    setMatchers([
        { cmd: KeyboardCmd.FocusCommand, match: { code: 'Semicolon', metaKey: false, shiftKey: true } },
    ])

    let commandInput: HTMLInputElement | undefined

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