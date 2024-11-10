/* @refresh reload */
import _ from 'lodash';
import { type Component, onCleanup, on, createEffect } from 'solid-js';
import { render } from 'solid-js/web';
import { Router, Route } from "@solidjs/router";
import { matchers, OtherWindowKeypressEvent, makeKeypressListener, otherWindowListener } from './models/keyboardCmd';
import { Layout } from './layout/Layout'
import { SelectContext } from './pages/SelectContext';
import { SelectNamespace } from './pages/SelectNamespace';
import { ResourceList } from './pages/ResourceList';
import { Resource } from './pages/Resource';
import { NotFound } from './pages/NotFound';

/**
 * The outer element of a single page app.
 *
 * Render in an iframe where the outer window
 * - has wails js bindings
 * - listens for events from keyboardCmd
 */
const TabContent: Component = () => {

  const keypressListener = makeKeypressListener((e: CustomEvent) => {
    window.parent.dispatchEvent(e)
  })
  window.addEventListener('keypress', keypressListener)
  onCleanup(() => window.removeEventListener('keypress', keypressListener))

  window.addEventListener(OtherWindowKeypressEvent, otherWindowListener)
  onCleanup(() => window.removeEventListener(OtherWindowKeypressEvent, otherWindowListener))

  window.addEventListener('popstate', () => { console.log('popstate') })

  createEffect(() => {
    console.log('matchers index.tsx', matchers())
  })

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