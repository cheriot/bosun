import { createSignal, onCleanup, type Component } from 'solid-js';
import { createStore } from "solid-js/store";
import { useNavigate } from "@solidjs/router";
import { createEffect, Show, on, For } from "solid-js"
import { KeyboardCmd, addKeyboardCmdListener, removeKeyboardCmdListener } from '../models/keyboardCmd';

type SelectableListProps = {
    initState: () => Promise<{ idx: number, list: string[] }>
    selectPath: (name: string) => string
}

export const SelectableList: Component<SelectableListProps> = (props: SelectableListProps) => {
    const navigate = useNavigate()
    const [store, setStore] = createStore({
        highlightedIdx: 0,
        list: new Array<string>(),
        originalList: new Array<string>(),
    })
    const filterList = (substr: string) => {
        const toSee = store.originalList.filter(v => v.includes(substr))
        if (toSee.length != store.list.length) setStore("highlightedIdx", 0)
        setStore("list", toSee)
    }
    const resetList = () => {
        setStore("list", store.originalList)
    }

    props.initState().then(result => {
        setStore({
            highlightedIdx: result.idx,
            list: result.list,
            originalList: result.list
        })
    })

    const matchers = [
        { cmd: KeyboardCmd.Down, match: { code: 'KeyJ', metaKey: false, shiftKey: false } },
        { cmd: KeyboardCmd.Up, match: { code: 'KeyK', metaKey: false, shiftKey: false } },
        { cmd: KeyboardCmd.Select, match: { code: 'Enter', metaKey: false, shiftKey: false } },
        { cmd: KeyboardCmd.FilterFind, match: { code: 'Slash', metaKey: false, shiftKey: false } },
    ]
    const listenerId = addKeyboardCmdListener(matchers, (keyboardCmd) => {
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
                navigate(props.selectPath(store.list[store.highlightedIdx]))
                break;
            case KeyboardCmd.FilterFind:
                setIsFiltering(!isFiltering())
                if (isFiltering()) {
                    filteringInputEl?.focus()
                }
                break;
        }
    })
    onCleanup(() => removeKeyboardCmdListener(listenerId))

    // List Filtering
    let filteringInputEl: HTMLInputElement | undefined
    const [isFiltering, setIsFiltering] = createSignal(false)
    const onkeyup = (e: KeyboardEvent) => {
        // backspace doesn't trigger onkeypress
        switch (e.code) {
            case 'Enter':
                filteringInputEl?.blur()
                break;
            case 'Escape':
                setIsFiltering(false)
                resetList()
                if (filteringInputEl) filteringInputEl.value = ''
                break;
            default:
                if (filteringInputEl) filterList(filteringInputEl.value)
        }
    }
    const onkeypress = (e: KeyboardEvent) => {
        // need to stopPropagation so they're not interpreted as keyboard commands
        e.stopPropagation()
    }
    const onchange = (e: Event) => {
        e.preventDefault()
    }

    return <div class="menu">
        <ul class="menu-list">
            <Show when={isFiltering()}>
                <input class={`input`}
                    ref={filteringInputEl}
                    type="text"
                    placeholder="filter"
                    onkeyup={onkeyup}
                    onkeypress={onkeypress}
                    onchange={onchange}>

                </input>
            </Show>

            <For each={store.list}>
                {(c, i) => <li><a classList={{ 'is-active': i() == store.highlightedIdx }} href={props.selectPath(c)}>{c}</a></li>}
            </For>
        </ul>
    </div>
}