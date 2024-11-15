/* @refresh reload */
import _ from 'lodash';
import { type Component, onCleanup, on, createEffect } from 'solid-js';
import { render } from 'solid-js/web';
import { Router, Route } from "@solidjs/router";
import { OtherWindowKeypressEvent, makeKeypressListener, otherWindowListener } from './models/keyboardCmd';
import { Layout } from './layout/Layout'
import { SelectContextPage } from './pages/SelectContextPage';
import { SelectNamespacePage } from './pages/SelectNamespacePage';
import { NamespacePage } from './pages/NamespacePage';
import { ResourceListPage } from './pages/ResourceListPage';
import { ResourcePage } from './pages/ResourcePage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * The outer element of a single page app.
 *
 * Render in an iframe where the outer window
 * - has wails js bindings
 * - listens for events from keyboardCmd
 */
const TabContent: Component = () => {

  // Listen for keypress from this window.
  const keypressListener = makeKeypressListener((e: CustomEvent) => {
    window.parent.dispatchEvent(e)
  })
  window.addEventListener('keypress', keypressListener)
  onCleanup(() => window.removeEventListener('keypress', keypressListener))

  // Listen for keypress from the outer window.
  window.addEventListener(OtherWindowKeypressEvent, otherWindowListener)
  onCleanup(() => window.removeEventListener(OtherWindowKeypressEvent, otherWindowListener))

  return (
    <Router root={Layout}>
      <Route path="/" component={SelectContextPage} />
      <Route path="/namespaces" component={SelectNamespacePage} />
      <Route path="/namespace" component={NamespacePage} />
      <Route path="/resources" component={ResourceListPage} />
      <Route path="/resource" component={ResourcePage} />
      <Route path="*404" component={NotFoundPage} />
    </Router>
  )
}

render(() => <TabContent />, document.getElementById('root') as HTMLElement);