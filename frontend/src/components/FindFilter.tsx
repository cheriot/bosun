import { createSignal, onCleanup, type Component } from 'solid-js';
import { createStore } from "solid-js/store";
import { useNavigate } from "@solidjs/router";
import { createEffect, Show, on, For } from "solid-js"
import { KeyboardCmd, addKeyboardCmdListener, removeKeyboardCmdListener } from '../models/keyboardCmd';

type FindFilterProps = {
    applyFilter: (s: string) => void
    removeFilter: () => void
}

export const FindFilter: Component<FindFilterProps> = (props) => {
    let filteringInputEl: HTMLInputElement | undefined
    const [isFiltering, setIsFiltering] = createSignal(false)

    // Open the filtering input on /
    const matchers = [
        { cmd: KeyboardCmd.FilterFind, match: { code: 'Slash', metaKey: false, shiftKey: false } },
    ]
    const listenerId = addKeyboardCmdListener(matchers, (keyboardCmd) => {
        switch (keyboardCmd) {
            case KeyboardCmd.FilterFind:
                setIsFiltering(!isFiltering())
                if (isFiltering()) {
                    filteringInputEl?.focus()
                }
                break;
        }
    })
    onCleanup(() => removeKeyboardCmdListener(listenerId))

    const onkeyup = (e: KeyboardEvent) => {
        // Use onkeyup instead of onkeypress because
        // 1. backspace doesn't trigger onkeypress
        // 2. we want to run after they key appears in input
        switch (e.code) {
            case 'Enter':
                filteringInputEl?.blur()
                break;
            case 'Escape':
                setIsFiltering(false)
                props.removeFilter()
                if (filteringInputEl) filteringInputEl.value = ''
                break;
            default:
                if (filteringInputEl) props.applyFilter(filteringInputEl.value)
        }
    }
    const onkeypress = (e: KeyboardEvent) => {
        // need to stopPropagation so they're not interpreted as keyboard commands
        e.stopPropagation()
    }
    const onchange = (e: Event) => {
        e.preventDefault()
    }

    return (
        <Show when={isFiltering()}>
            <input class={`input`}
                ref={filteringInputEl}
                type="text"
                placeholder="filter"
                onkeyup={onkeyup}
                onkeypress={onkeypress}
                onchange={onchange} />
        </Show>
    )
}