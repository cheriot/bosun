import type { Component, Accessor } from 'solid-js';
import { createEffect, createResource, Show, on } from "solid-js"
import { ParentProps } from 'solid-js';
import { createSignal, createContext, useContext, For } from "solid-js";

import type { ResourceReturn, ResourceOptions } from "solid-js"

import styles from './App.module.css';

import { tabs as desktop } from '../wailsjs/go/models';
import { Tabs, SelectTab, CloseTab, NewTab, PrevTab, NextTab } from '../wailsjs/go/desktop/FrontendApi';
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
    console.log('App', e.code, e.key, 'ctrl', e.ctrlKey, 'meta', e.metaKey, 'shift', e.shiftKey)
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

  const initialTabs = { all: [] }
  const [tabs, { mutate }] = createResource(() => {
    return Tabs()
  }, { initialValue: initialTabs })

  const selectTab = (id: string) => {
    console.log('selectTab')
    SelectTab(id).then(mutate)
  }

  const newTab = () => {
    NewTab().then(mutate)
  }

  const closeTab = (id: string) => {
    CloseTab(id).then(mutate)
  }

  createEffect(on(keyboardCmd, (keyboardCmd) => {
    switch (keyboardCmd) {
      case KeyboardCmd.NewTab:
        newTab()
        break;
      case KeyboardCmd.CloseTab:
        closeTab(tabs().Current)
        break;
      case KeyboardCmd.PrevTab:
        console.log('prev')
        PrevTab().then(mutate)
        break;
      case KeyboardCmd.NextTab:
        console.log('next')
        NextTab().then(mutate)
        break;
      default:
        console.log('unknown cmd', keyboardCmd)
        throw new Error('unknown keyboard cmd')
    }
  }, { defer: true }))

  return (
    <TabbedBrowser tabs={tabs} selectTab={selectTab} newTab={newTab} closeTab={closeTab} />
  );
};


interface TabbedBrowserProps {
  tabs: Accessor<desktop.Tabs>
  selectTab: (id: string) => void
  newTab: () => void
  closeTab: (id: string) => void
}
function TabbedBrowser(props: TabbedBrowserProps) {
  return (
    <div class="columns is-gapless">

      {/* sidebar for tabs */}
      <div class={`column is-narrow ${styles.column1}`}>
        <aside class="menu">
          <ul class="menu-list">
            <For each={props.tabs().All}>
              {(item) =>
                <li>
                  <a
                    class={styles.tabMenuItem}
                    classList={{ 'is-active': props.tabs().Current === item.Id }}
                    on:click={() => {
                      props.selectTab(item.Id)

                    }}>
                    <div>{item.K8sContext}</div>
                    <div>{item.K8sNamespace}</div>
                    <div
                      class={styles.tabClose}
                      on:click={(e: Event) => {
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

      {/* tab content for the selected tab*/}
      <For each={props.tabs().All}>
        {(item) =>
          <Show when={item.Id === props.tabs().Current}>
            <div class='column'>
              <p>tab content {item.Id} {item.Page}</p>
              <iframe src="tabcontent.html" />
            </div>
          </Show>
        }
      </For>
      <p>
        {JSON.stringify(props.tabs())}
      </p>
    </div>
  )
}


export default App;
