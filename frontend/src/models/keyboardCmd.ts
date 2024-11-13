import _ from "lodash"
import { createSignal } from "solid-js"

// Event to pass keypresses between windows:
// 1. parent -> active child
// 2. child -> parent
export const OtherWindowKeypressEvent = 'otherWindowKeypressEvent'

enum KeyboardCmd {
    // Placeholder
    Nothing = 1,
    // Tabs
    NewTab,
    CloseTab,
    PrevTab,
    NextTab,
    // Layout
    FocusCommand,
    HierarchyUp,
    // Within page
    Down,
    Up,
    Select,
}

export type Key = {
    code: string
    metaKey: boolean
    shiftKey: boolean
}

export type Matcher = {
    cmd: KeyboardCmd
    match: Key
}

const [currentKeyboardCmd, setCurrentKeyboardCmd] = createSignal(KeyboardCmd.Nothing, {
    equals(prev, next) {
        // never merge subsequent events
        // Ex. Cmd+T three times should open three tabs
        return false
    },
})

export const [matchers, setMatchers] = createSignal(new Array<Matcher>())

export const addMachers = (additional: Array<Matcher>) => {
    setMatchers([...matchers(), ...additional])
}

type OtherWindowDispatcher = (e: CustomEvent) => void
type KeyboardListener = (e: KeyboardEvent) => void
export const makeKeypressListener = (f: OtherWindowDispatcher): KeyboardListener => {

    return (e: KeyboardEvent) => {
        const isInputElement = (e.target as HTMLElement)?.tagName == "INPUT"
        const keyboardCmd = matchKeyboardEvent(e)
        if (keyboardCmd || !isInputElement) {
            // stops the "no handler" sound on desktop
            // stops the keyboard command : from being typed into the focused input
            // do not call this for input elements because it prevents entering text
            e.preventDefault()
        }

        if (keyboardCmd) {
            console.log('keyboardCmd a', e.code, keyboardCmd)
            setCurrentKeyboardCmd(keyboardCmd)
        } else {
            const data = {
                detail: _.pick(e, 'code', 'metaKey', 'shiftKey')
            }
            f(new CustomEvent<Key>(OtherWindowKeypressEvent, data))
        }
    }
}

export const otherWindowListener = (e: Event) => {
    // Event created in makeKeypressListener so we know what it is.
    const ce = e as CustomEvent<Key>
    const keyboardCmd = matchKeyboardEvent(ce.detail)
    if (keyboardCmd) {
        console.log('keyboardCmd b', keyboardCmd)
        setCurrentKeyboardCmd(keyboardCmd)
    }
}

const matchKeyboardEvent = (e: Key): KeyboardCmd | undefined => {
    for (let m of matchers()) {
        if (m.match.code == e.code
            && m.match.metaKey == e.metaKey
            && m.match.shiftKey == e.shiftKey) {

            return m.cmd
        }
    }
    return
}

export { KeyboardCmd, currentKeyboardCmd }