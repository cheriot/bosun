import _ from "lodash"

// Event to pass keypresses between windows:
// 1. parent -> active child
// 2. child -> parent
export const OtherWindowKeypressEvent = 'otherWindowKeypressEvent'

export enum KeyboardCmd {
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
    FilterFind,
}

// Exclude keys from keyboard commands so copy/past still work.
const excludeKeys = ['KeyC', 'KeyV']

export type Key = {
    code: string
    metaKey: boolean
    shiftKey: boolean
}

export type Matcher = {
    cmd: KeyboardCmd
    match: Key
}

type CmdListeners = { matchers: Matcher[], listener: (cmd: KeyboardCmd) => void }
const keyboardCmdListeners: { [key: string]: CmdListeners } = {}

export const addKeyboardCmdListener = (matchers: Matcher[], listener: (cmd: KeyboardCmd) => void): string => {
    const id = window.crypto.randomUUID()
    keyboardCmdListeners[id] = { matchers, listener }
    return id
}

export const removeKeyboardCmdListener = (id: string): boolean => {
    return delete keyboardCmdListeners[id]
}

type OtherWindowDispatcher = (e: CustomEvent) => void
type KeyboardListener = (e: KeyboardEvent) => void
export const makeKeypressListener = (f: OtherWindowDispatcher): KeyboardListener => {

    return (e: KeyboardEvent) => {
        const isInputElement = (e.target as HTMLElement)?.tagName == "INPUT"
        const triggered = triggerListeners(e)
        // const keyboardCmd = matchKeyboardEvent(e)
        if (triggered || (!isInputElement && !excludeKeys.includes(e.code))) {
            // Stops the keyboard command : from being typed into the focused input.
            // Stops the "no handler" sound on desktop.
            // Do not call this for events originating from an input because it will
            // prevent typing.
            e.preventDefault()
        }

        if (triggered) {
            console.log('keyboardCmd a', e.code)
            // setCurrentKeyboardCmd(keyboardCmd)
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
    const triggered = triggerListeners(ce.detail)
    if (triggered) {
        console.log('keyboardCmd b', ce.detail)
    }
}

const triggerListeners = (e: Key): boolean => {
    let triggered = false
    _.values(keyboardCmdListeners).forEach(({ matchers, listener }) => {
        const matches = _.filter(matchers, (m) => {
            return m.match.code == e.code
                && m.match.metaKey == e.metaKey
                && m.match.shiftKey == e.shiftKey
        })
        if (matches.length > 0) {
            if (matches.length > 1) console.error('too many matches for cmd', matches)
            listener(matches[0].cmd)
            triggered = true
        }
    })
    return triggered
}