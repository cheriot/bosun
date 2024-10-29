import type { Component, Accessor, InitializedResourceOptions } from 'solid-js';
import { createEffect, createResource, Show, on, onCleanup, untrack } from "solid-js"
import { ParentProps } from 'solid-js';
import { createSignal, createContext, useContext, Index, For } from "solid-js";
import { Store, createStore, unwrap } from "solid-js/store"

import type { ResourceReturn, ResourceOptions } from "solid-js"

import styles from './Browser.module.css';

import { tabs as desktop } from '../wailsjs/go/models';
import { Tabs, SelectTab, CloseTab, NewTab, PrevTab, NextTab, UpdateTab } from '../wailsjs/go/desktop/FrontendApi';
import { matchKeyboardEvent, cmdFromCustomEvent, EventName as KeyboardCmdEvent, KeyboardCmd } from './keyboardCmd';

const App: Component = () => {
  const [keyboardCmd, setKeyboardCmd] = createSignal(KeyboardCmd.Nothing, {
    equals(prev, next) {
      // never merge subsequent events
      // Ex. Cmd+T three times should open three tabs
      return false
    },
  })

  window.addEventListener('keypress', (e: KeyboardEvent) => {
    // OS specific meta key!
    const cmd = matchKeyboardEvent(e)
    if (cmd !== undefined) {
      // stops the "no handler" sound on desktop
      e.stopPropagation()
      e.preventDefault()
      setKeyboardCmd(cmd)
    }
  })

  window.addEventListener(KeyboardCmdEvent, (e: Event) => {
    const cmd = cmdFromCustomEvent(e as CustomEvent)
    setKeyboardCmd(cmd)
  })
  // do I need to clean up?
  // onCleanup(() => window.removeEventListener)

  const [tabs, setTabs] = createStore(desktop.Tabs.createFrom({ All: [], Current: '' }))
  Tabs().then(setTabs)

  const selectTab = (id: string) => {
    SelectTab(id).then(setTabs)
  }

  const newTab = () => {
    NewTab().then(setTabs)
  }

  const closeTab = (id: string) => {
    CloseTab(id).then(setTabs)
  }

  const updateTab = (id: string, k8sCtx: string, k8sNs: string | null, path: string) => {
    UpdateTab(id, k8sCtx, k8sNs || "", path).then(setTabs)
  }

  createEffect(on(keyboardCmd, (keyboardCmd) => {
    switch (keyboardCmd) {
      case KeyboardCmd.NewTab:
        newTab()
        break;
      case KeyboardCmd.CloseTab:
        closeTab(tabs.Current)
        break;
      case KeyboardCmd.PrevTab:
        PrevTab().then(setTabs)
        break;
      case KeyboardCmd.NextTab:
        NextTab().then(setTabs)
        break;
      default:
        console.log('unknown cmd', keyboardCmd)
        throw new Error('unknown keyboard cmd')
    }
  }, { defer: true }))

  return (
    <TabbedBrowser tabs={tabs} selectTab={selectTab} newTab={newTab} closeTab={closeTab} updateTab={updateTab} />
  );
};


interface TabbedBrowserProps {
  tabs: Store<desktop.Tabs>
  selectTab: (id: string) => void
  newTab: () => void
  closeTab: (id: string) => void
  updateTab: (id: string, k8sCtx: string, k8sNs: string | null, path: string) => void
}
function TabbedBrowser(props: TabbedBrowserProps) {

  const iframeOnLoad = () => {
    console.log('iframe onload')
    // Adjust the iframe height based on the size of the content.
    // const height = e.target.contentWindow.document.body.scrollHeight + 40
    // e.target.style.height = `${height}px`;
    // console.log('iframeOnLoad', e.target.style.height)
  }

  let iframeParent: HTMLDivElement | undefined;

  // Update tab ctx, ns based on iframe query params.
  createEffect(on(() => props.tabs.All, () => {
    if (iframeParent) {
      const activeIframe = iframeParent.querySelector(`iframe.active`)
      if (activeIframe instanceof HTMLIFrameElement) {

        const intId = setInterval(() => {
          const location = activeIframe?.contentWindow?.location
          if (location) {
            const searchParams = new URLSearchParams(location.search)
            let k8sCtx = searchParams.get('k8sCtx')
            let k8sNs = searchParams.get('k8sNs')
            const id = activeIframe.id
            const path = location.pathname + location.search
            const current = props.tabs.All.find((t) => t.Id == id)
            if (!!current
              && !!k8sCtx
              && (
                (k8sCtx != current.K8sContext)
                || (!!k8sNs && (k8sNs != current.K8sNamespace))
                || (!!path && (path != current.Path))
              )) {
              console.log('updateTab', !!current, !!k8sCtx)

              // only update if something has changed!
              props.updateTab(id, k8sCtx, k8sNs, path)
            }
          }
        }, 30)

        onCleanup(() => {
          clearInterval(intId)
        })
      }
    }
  }))

  return (
    <div class="columns is-gapless">

      {/* sidebar for tabs */}
      <div class={`column is-narrow ${styles.column1}`}>
        <aside class="menu">
          <ul class="menu-list">
            <For each={props.tabs.All}>
              {(item) =>
                <li>
                  <a
                    class={styles.tabMenuItem}
                    classList={{ 'is-active': props.tabs.Current === item.Id }}
                    onclick={() => {
                      props.selectTab(item.Id)
                    }}>
                    <div>{item.K8sContext}</div>
                    <div>{item.K8sNamespace}</div>
                    <div>{item.Id}</div>
                    <div
                      class={styles.tabClose}
                      onclick={(e: Event) => {
                        e.stopPropagation()
                        props.closeTab(item.Id)
                      }}>
                      ✖️
                    </div>
                  </a>
                </li>
              }
            </For>

            <li>
              <a
                class={`${styles.newTab} has-text-centered is-size-3`}
                onClick={props.newTab}>
                +
              </a>
            </li>
          </ul>
        </aside>
      </div>

      {/* tab content for the selected tab */}
      <div class='column' ref={iframeParent}>
        <Index each={props.tabs.All}>
          {(item) =>
            <div classList={{
              [styles.hidden]: item().Id != props.tabs.Current,
              [styles.content]: true
            }}>{item().Path}</div>
          }
        </Index>
        <Index each={props.tabs.All}>
          {(item) =>
            <iframe classList={{
              [styles.hidden]: untrack(item).Id != props.tabs.Current,
              'active': untrack(item).Id == props.tabs.Current,
              [styles.content]: true
            }} id={untrack(item).Id} src={untrack(item).Path} onload={iframeOnLoad} />
          }
        </Index>
      </div>
    </div>
  )
}


export default App;
