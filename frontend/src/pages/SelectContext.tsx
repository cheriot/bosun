import { type Component } from 'solid-js';
import { createStore } from "solid-js/store";
import { useSearchParams, useLocation, useNavigate } from "@solidjs/router";
import { KubeContexts } from '../../wailsjs/go/desktop/FrontendApi';
import { local } from '../../wailsjs/go/models';
import { createEffect, createResource, Show, on, For } from "solid-js"
import { setPageTitle } from '../models/pageMeta';
import { BreadcrumbBuilder, setBreadcrumbs } from '../models/breadcrumbs';
import { addMachers, currentKeyboardCmd, KeyboardCmd } from '../models/keyboardCmd';

export const SelectContext: Component = () => {
    const navigate = useNavigate()
    const location = useLocation();
    const [searchParams] = useSearchParams();

    createEffect(() => {
        setPageTitle('Select Context', location, searchParams)
        setBreadcrumbs([])
    })

    KubeContexts
    const [kctxs] = createResource(() => {
        return KubeContexts()
    }, { initialValue: [] })

    const [store, setStore] = createStore({
        highlightedIdx: -1,
        list: new Array<string>(),
    })
    KubeContexts().then((result) => {
        setStore({
            highlightedIdx: searchParams.k8sCtx ?
                result.findIndex(r => r.Name == searchParams.k8sCtx) :
                result.findIndex(r => r.IsActive),
            list: result.map(r => r.Name)
        })
    })

    const selectPath = (k8sCtx: string) => `/namespaces?k8sCtx=${k8sCtx}`

    const selectedIdx = () => {
        return kctxs().findIndex((k8sCtx) => k8sCtx.IsActive)
    }

    addMachers([
        { cmd: KeyboardCmd.Down, match: { code: 'KeyJ', metaKey: false, shiftKey: false } },
        { cmd: KeyboardCmd.Up, match: { code: 'KeyK', metaKey: false, shiftKey: false } },
        { cmd: KeyboardCmd.Select, match: { code: 'Enter', metaKey: false, shiftKey: false } },
    ])
    createEffect(on(currentKeyboardCmd, (keyboardCmd) => {
        switch (keyboardCmd) {
            case KeyboardCmd.Down:
                setStore("highlightedIdx", (store.highlightedIdx + 1) % store.list.length)
                break;
            case KeyboardCmd.Up:
                let next = store.highlightedIdx - 1
                next = next >= 0 ? next : store.list.length - 1
                setStore("highlightedIdx", next)
                break;
            case KeyboardCmd.Select:
                console.log(store.list[store.highlightedIdx])
                navigate(selectPath(store.list[store.highlightedIdx]))
                break;
        }
    }))

    return (
        <div>
            <p>select context</p>
            <div class="menu">
                <ul class="menu-list">
                    <For each={store.list}>
                        {(c, i) => <li><a classList={{ 'is-active': i() == store.highlightedIdx }} href={selectPath(c)}>{c}</a></li>}
                    </For>
                </ul>
            </div>
        </div>
    )
}