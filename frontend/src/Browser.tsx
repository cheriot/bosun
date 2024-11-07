import _ from 'lodash';
import type { Component, Accessor, InitializedResourceOptions } from 'solid-js';
import { createEffect, createResource, Show, on, onCleanup, untrack } from "solid-js"
import { ParentProps } from 'solid-js';
import { createSignal, createContext, useContext, Index, For } from "solid-js";
import { Store, createStore, unwrap } from "solid-js/store"

import type { ResourceReturn, ResourceOptions } from "solid-js"

import styles from './Browser.module.css';

import { tabs as desktop } from '../wailsjs/go/models';
import { Tabs, SelectTab, CloseTab, NewTab, PrevTab, NextTab, UpdateTab } from '../wailsjs/go/desktop/FrontendApi';
import { detailFromCustomEvent, EventName as TabUpdateEvent } from './models/pageMeta';
import { matchKeyboardEvent, cmdFromCustomEvent, EventName as KeyboardCmdEvent, KeyboardCmd } from './models/keyboardCmd';

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
      e.stopPropagation()
      e.preventDefault() // stops the "no handler" sound on desktop
      setKeyboardCmd(cmd)
    }
  })

  window.addEventListener(KeyboardCmdEvent, (e: Event) => {
    const cmd = cmdFromCustomEvent(e as CustomEvent)
    setKeyboardCmd(cmd)
  })

  window.addEventListener(TabUpdateEvent, (e: Event) => {
    const pageMeta = detailFromCustomEvent(e as CustomEvent)
    updateTab(pageMeta.id, pageMeta.k8sCtx, pageMeta.k8sNs, pageMeta.path, pageMeta.title)
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

  const updateTab = (id: string, k8sCtx: string | undefined, k8sNs: string | undefined, path: string, title: string) => {
    UpdateTab(id, k8sCtx || "", k8sNs || "", path, title).then((tabs) => {
      setTabs(tabs)
    })
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
    <TabbedBrowser tabs={tabs} selectTab={selectTab} newTab={newTab} closeTab={closeTab} />
  );
};


interface TabbedBrowserProps {
  tabs: Store<desktop.Tabs>
  selectTab: (id: string) => void
  newTab: () => void
  closeTab: (id: string) => void
}
function TabbedBrowser(props: TabbedBrowserProps) {

  const iframeOnLoad = () => {
    console.log('iframe onload')
  }

  let iframeParent: HTMLDivElement | undefined;

  createEffect(() => {
    // Manage lifecycle of iframes.
    // 1. don't set iframe#src after creation (it triggers a page reload and loses scroll state)
    // 2. set src query's tabId so children can identify themselves
    // It's undefined afaik on whether this function will be called before or after JSX has
    // rendered so handle both.
    if (iframeParent) {
      const allContainers = iframeParent.querySelectorAll(`.iframeContainer`)

      const containerById: { [key: string]: Element } = {}
      allContainers.forEach((container) => {
        const id = container.getAttribute('id')
        if (id) {
          containerById[id] = container
        } else {
          console.log('unexpected values id, iframe', id, container)
        }
      })

      const tabsById: { [key: string]: desktop.Tab } = {}
      if (props.tabs.All) {
        props.tabs.All.forEach((t) => tabsById[t.Id] = t)
      }

      // Changes required
      const toCreate: Array<desktop.Tab> = _.filter(tabsById, (t) => containerById[t.Id] == undefined)
      const toDelete: Array<string> = _.filter(Object.keys(containerById), (id) => tabsById[id] == undefined)

      toCreate.forEach(t => {
        const newIframe = document.createElement('iframe')
        newIframe.setAttribute('id', t.Id)
        newIframe.classList.add(styles.content)
        newIframe.setAttribute('src', pathWithTabId(t.Path, t.Id))

        const newContainer = document.createElement('div')
        newContainer.setAttribute('id', t.Id)
        newContainer.classList.add('iframeContainer')
        if (props.tabs.Current != t.Id) {
          newContainer.classList.add('is-hidden')
        }
        newContainer.appendChild(newIframe)
        iframeParent.appendChild(newContainer)
      });

      toDelete.forEach(id => {
        iframeParent.removeChild(containerById[id])
      })

      // Only update visibility. Never update iframe#src.
      // Since only one iframe is visible at a time, order doesn't matter.
      Object.entries(containerById).forEach(([id, iframe]) => {
        if (id == props.tabs.Current && iframe.classList.contains('is-hidden')) {
          iframe.classList.remove('is-hidden')
        }
        if (id != props.tabs.Current && !iframe.classList.contains('is-hidden')) {
          iframe.classList.add('is-hidden')
        }
      });

    } else {
      console.log('no iframeParent')
      // setTimeout? to wait for iframeParent?
    }
  })

  return (
    <div class="columns is-gapless">

      {/* sidebar for tabs */}
      <div class="column is-narrow">
        <aside class={`menu ${styles.tabList}`}>
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
                    <div>{item.Title}</div>
                    <div>{item.K8sNamespace}</div>
                    <div>{item.K8sContext}</div>
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
        {/* <Index each={props.tabs.All}>
          {(item) =>
            <div classList={{ 'is-hidden': item().Id != props.tabs.Current }}>
              <iframe
                id={untrack(item).Id}
                class={styles.content}
                src={pathWithTabId(untrack(item).Path, untrack(item).Id)}
                onload={iframeOnLoad} />
            </div>
          }
        </Index> */}
      </div>
    </div>
  )
}

const pathWithTabId = (path: string, tabId: string): string => {
  let modifiedPath = path
  if (!path) {
    modifiedPath = `?tabId=${tabId}`
  } else {
    let qIdx = path.indexOf('?')
    if (qIdx == -1) {
      modifiedPath = path + `?tabId=${tabId}`
    } else {
      const pre = path.substring(0, qIdx)
      const post = path.substring(qIdx)
      const urlSearchParams = new URLSearchParams(post)
      // A new tab will get the path of the previous tab, which may have a tabId.
      urlSearchParams.delete('tabId')
      urlSearchParams.append('tabId', tabId)
      modifiedPath = pre + '?' + urlSearchParams.toString()
    }
  }

  return modifiedPath
}


export default App;
