/* @refresh reload */
import { type Component, onCleanup } from 'solid-js';
import { render } from 'solid-js/web';
import { Router, Route } from "@solidjs/router";
import { matchKeyboardEvent, createCustomEvent } from './keyboardCmd';
import { Layout } from './layout/Layout'
import { SelectContext } from './pages/SelectContext';

import './index.css';

/**
 * The outer element of a single page app.
 *
 * Render in an iframe where the outer window has
 * - has wails js bindings
 * - listens for events from keyboardCmd
 */
const TabContent: Component = () => {

  const keypressListener = (e: KeyboardEvent) => {
    const keyboardCmd = matchKeyboardEvent(e)
    if (keyboardCmd !== undefined) {
      e.stopPropagation() // stops the "no handler" sound on desktop
      window.parent.dispatchEvent(createCustomEvent(keyboardCmd))
    }
  }

  window.addEventListener('keypress', keypressListener)
  onCleanup(() => window.removeEventListener('keypress', keypressListener))

  return (
    <Router root={Layout}>
      <Route path="/" component={SelectContext} />
    </Router>
  )
}

render(() => <TabContent />, document.getElementById('root') as HTMLElement);