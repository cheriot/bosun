/* @refresh reload */
import { onCleanup, type Component } from 'solid-js';
import { render } from 'solid-js/web';
import { matchKeyboardEvent, createCustomEvent } from './keyboardCmd';

import './index.css';

const TabContent: Component = () => {

    window.addEventListener('keypress', (e: KeyboardEvent) => {
        console.log('TabContent', e.code, e.key, 'ctrl', e.ctrlKey, 'meta', e.metaKey, e.shiftKey)

        const keyboardCmd = matchKeyboardEvent(e)
        if (keyboardCmd !== undefined) {
            console.log('send it')
            e.stopPropagation() // stops the "no handler" sound on desktop
            window.parent.dispatchEvent(createCustomEvent(keyboardCmd))
        }
    })

    // onCleanup(() => window.removeEventListener)
    return (
        <div>page component content</div>
    )
}

render(() => <TabContent />, document.getElementById('root') as HTMLElement);