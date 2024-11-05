/* @refresh reload */
import { type Component, onCleanup, on, createEffect } from 'solid-js';
import { render } from 'solid-js/web';
import { Router, Route } from "@solidjs/router";
import { matchKeyboardEvent, createCustomEvent } from './models/keyboardCmd';
import { Layout } from './layout/Layout'
import { SelectContext } from './pages/SelectContext';
import { SelectNamespace } from './pages/SelectNamespace';
import { ResourceList } from './pages/ResourceList';
import { Resource } from './pages/Resource';
import { NotFound } from './pages/NotFound';

/**
 * The outer element of a single page app.
 *
 * Render in an iframe where the outer window has
 * - has wails js bindings
 * - listens for events from keyboardCmd
 */
const TabContent: Component = () => {

  // forward keyboard commands to the parent window
  const keypressListener = (e: KeyboardEvent) => {
    const keyboardCmd = matchKeyboardEvent(e)
    if (keyboardCmd !== undefined) {
      e.stopPropagation()
      e.preventDefault() // stops the "no handler" sound on desktop
      window.parent.dispatchEvent(createCustomEvent(keyboardCmd))
    }
  }

  window.addEventListener('keypress', keypressListener)
  onCleanup(() => window.removeEventListener('keypress', keypressListener))

  window.addEventListener('popstate', () => { console.log('popstate') })
  //oncleanup
  //   const [searchParams, setSearchParams] = useSearchParams();
  //   createEffect(on(searchParams, () => {
  //     console.log('query params', window.location)
  //   }))

  return (
    <Router root={Layout}>
      <Route path="/" component={SelectContext} />
      <Route path="/namespaces" component={SelectNamespace} />
      <Route path="/resources" component={ResourceList} />
      <Route path="/resource" component={Resource} />
      <Route path="*404" component={NotFound} />
    </Router>
  )
}

render(() => <TabContent />, document.getElementById('root') as HTMLElement);