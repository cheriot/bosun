
const EventName = "keyboardCmd"

enum KeyboardCmd {
    NewTab = 1,
    CloseTab,
    PrevTab,
    NextTab,
    Nothing,
}

const matchers = [
    { cmd: KeyboardCmd.NewTab, match: { code: 'KeyT', metaKey: true, shiftKey: false } },
    { cmd: KeyboardCmd.CloseTab, match: { code: 'KeyW', metaKey: true, shiftKey: false } },
    { cmd: KeyboardCmd.PrevTab, match: { code: 'BracketLeft', metaKey: true, shiftKey: true } },
    { cmd: KeyboardCmd.NextTab, match: { code: 'BracketRight', metaKey: true, shiftKey: true } },
    { cmd: KeyboardCmd.Nothing, match: { code: 'KeyB', metaKey: true, shiftKey: false } },
]

const matchKeyboardEvent = (e: KeyboardEvent): KeyboardCmd | undefined => {
    console.log('match for ', e.code, e.metaKey, e.shiftKey)
    for (let m of matchers) {
        if (m.match.code == e.code
            && m.match.metaKey == e.metaKey
            && m.match.shiftKey == e.shiftKey) {

            console.log('found it', m.cmd)
            return m.cmd
        }
    }
    return
}

const createCustomEvent = (keyboardCmd: KeyboardCmd): CustomEvent =>
    new CustomEvent(EventName, { detail: keyboardCmd });

const cmdFromCustomEvent = (e: CustomEvent): KeyboardCmd =>
    e.detail

export { KeyboardCmd, matchKeyboardEvent, createCustomEvent, cmdFromCustomEvent, EventName }