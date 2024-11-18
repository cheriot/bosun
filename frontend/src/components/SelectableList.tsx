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
        list: new Array<string>(),
        originalList: new Array<string>(),
    })
    const filterList = (substr: string) => {
        const toSee = store.originalList.filter(v => v.includes(substr))
        if (toSee.length != store.list.length) resetHighlightIdx()
        setStore("list", toSee)
    }
    const resetList = () => {
        setStore("list", store.originalList)
    }

    props.initState().then(result => {
        setStore({
            list: result.list,
            originalList: result.list
        })
    })

    const listLength = () => store.list.length
    const navTo = (i: number) => navigate(props.selectPath(store.list[i]))
    const [highlightIdx, resetHighlightIdx] = makeSelectable(listLength, navTo)

    return <div class="menu">
        <ul class="menu-list">
            <FindFilter applyFilter={filterList} removeFilter={resetList} />

            <For each={store.list}>
                {(c, i) => <li><a classList={{ 'is-active': i() == highlightIdx() }} href={props.selectPath(c)}>{c}</a></li>}
            </For>
        </ul>
    </div>
}

// Keyboard selection j,k,enter
export const makeSelectable = (listLength: () => number, navTo: (idx: number) => void) => {
    const [highlightedIdx, setHighlightedIdx] = createSignal(0)
    const matchers = [
        { cmd: KeyboardCmd.Down, match: { code: 'KeyJ', metaKey: false, shiftKey: false } },
        { cmd: KeyboardCmd.Up, match: { code: 'KeyK', metaKey: false, shiftKey: false } },
        { cmd: KeyboardCmd.Select, match: { code: 'Enter', metaKey: false, shiftKey: false } },
    ]
    const listenerId = addKeyboardCmdListener(matchers, (keyboardCmd) => {
        switch (keyboardCmd) {
            case KeyboardCmd.Down:
                const nextIdx = (highlightedIdx() + 1) % listLength()
                setHighlightedIdx(nextIdx)
                break;
            case KeyboardCmd.Up:
                let next = highlightedIdx() - 1
                next = next >= 0 ? next : listLength() - 1
                setHighlightedIdx(next)
                break;
            case KeyboardCmd.Select:
                navTo(highlightedIdx())
                break;
        }
    })
    onCleanup(() => removeKeyboardCmdListener(listenerId))

    return [highlightedIdx, () => setHighlightedIdx(0)]
}