import { createSignal, onCleanup, type Component } from 'solid-js';
import { Show } from "solid-js"
import { KeyboardCmd, addKeyboardCmdListener, removeKeyboardCmdListener } from '../models/keyboardCmd';
import styles from './FindFilter.module.css'

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
        // Use onkeyup because
        // 1. backspace doesn't trigger onkeypress
        // 2. we want to run after they new character appears in input
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

    return (
        <Show when={isFiltering()}>
            <input class={`input ${styles.findFilter}`}
                ref={filteringInputEl}
                autocomplete="off"
                autocorrect="off"
                type="text"
                placeholder="filter"
                onkeyup={onkeyup}
                onkeypress={onkeypress} />
        </Show>
    )
}

export const FindText: Component = () => {
    let filteringInputEl: HTMLInputElement | undefined
    const [isSearching, setIsSearching] = createSignal(false)

    // Open the filtering input on /
    const matchers = [
        { cmd: KeyboardCmd.FilterFind, match: { code: 'Slash', metaKey: false, shiftKey: false } },
    ]
    const listenerId = addKeyboardCmdListener(matchers, (keyboardCmd) => {
        switch (keyboardCmd) {
            case KeyboardCmd.FilterFind:
                setIsSearching(!isSearching())
                if (isSearching()) {
                    filteringInputEl?.focus()
                }
                break;
        }
    })
    onCleanup(() => removeKeyboardCmdListener(listenerId))

    const onkeyup = (e: KeyboardEvent) => {
        console.log('FindText', filteringInputEl?.value)
        // Non-standard, but it exists everywhere.
        // https://developer.mozilla.org/en-US/docs/Web/API/Window/find
        // find(aString, aCaseSensitive, aBackwards, aWrapAround, aWholeWord, aSearchInFrames, aShowDialog)
        filteringInputEl?.focus()
        // Use onkeyup because
        // 1. backspace doesn't trigger onkeypress
        // 2. we want to run after they new character appears in input
        switch (e.code) {
            case 'Enter':
                window.find(filteringInputEl?.value, false, false, true, true, true, false)
                break;
            case 'Escape':
                if (filteringInputEl) filteringInputEl.value = ''
                setIsSearching(false)
                break;
            default:
            // if (filteringInputEl) props.applyFilter(filteringInputEl.value)
        }
    }
    return (
        <Show when={isSearching()}>
            <input class={`input ${styles.findFilter}`}
                ref={filteringInputEl}
                autocomplete="off"
                autocorrect="off"
                type="text"
                placeholder="filter"
                onkeyup={onkeyup}
                onkeypress={onkeypress} />
        </Show>
    )
}

const onkeypress = (e: KeyboardEvent) => {
    // need to stopPropagation so they're not interpreted as keyboard commands
    e.stopPropagation()
}