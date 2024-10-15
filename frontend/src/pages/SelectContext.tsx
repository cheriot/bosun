import { type Component } from 'solid-js';
import { KubeContexts } from '../../wailsjs/go/desktop/FrontendApi';
import { local } from '../../wailsjs/go/models';
import { createEffect, createResource, Show, on } from "solid-js"

export const SelectContext: Component = () => {
    const emptyTabs: Array<local.KubeContext> = []
    const [kctx, { mutate }] = createResource(() => {
        return KubeContexts()
    }, { initialValue: emptyTabs })

    return (
        <div>
            <p>select context</p>
            <p>{JSON.stringify(kctx())}</p>
        </div>
    )
}