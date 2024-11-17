import { createSignal, onCleanup, type Component } from 'solid-js';
import { createStore } from "solid-js/store";
import { useNavigate } from "@solidjs/router";
import { createEffect, Show, on, For } from "solid-js"
import { KeyboardCmd, addKeyboardCmdListener, removeKeyboardCmdListener } from '../models/keyboardCmd';
import { FindFilter } from './FindFilter';

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
        }
    })
    onCleanup(() => removeKeyboardCmdListener(listenerId))

    return <div class="menu">
        <ul class="menu-list">
            <FindFilter applyFilter={filterList} removeFilter={resetList} />

            <For each={store.list}>
                {(c, i) => <li><a classList={{ 'is-active': i() == store.highlightedIdx }} href={props.selectPath(c)}>{c}</a></li>}
            </For>
        </ul>
    </div>
}