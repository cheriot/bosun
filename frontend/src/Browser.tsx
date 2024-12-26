import _ from 'lodash';
import type { Component, Accessor, InitializedResourceOptions } from 'solid-js';
import { createEffect, createResource, Show, on, onCleanup, untrack } from "solid-js"
import { createSignal, createContext, useContext, Index, For } from "solid-js";
import { Store, createStore } from "solid-js/store"

import styles from './Browser.module.css';

import { tabs as desktop } from '../wailsjs/go/models';
import { Tabs, SelectTab, CloseTab, NewTab, PrevTab, NextTab, UpdateTab } from '../wailsjs/go/desktop/FrontendApi';
import { detailFromCustomEvent, EventName as TabUpdateEvent } from './models/pageMeta';
import { KeyboardCmd, OtherWindowKeypressEvent, makeKeypressListener, otherWindowListener, addKeyboardCmdListener, removeKeyboardCmdListener } from './models/keyboardCmd';

/**
 * Outer element of a single page app.
 *
 * @returns JSX for the outer window of a tabbed browser
 */
const App: Component = () => {

  // Child frames notify that tab attributes have changed.
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


  const matchers = [
    { cmd: KeyboardCmd.NewTab, match: { code: 'KeyT', metaKey: true, shiftKey: false } },
    { cmd: KeyboardCmd.CloseTab, match: { code: 'KeyW', metaKey: true, shiftKey: false } },
    { cmd: KeyboardCmd.PrevTab, match: { code: 'BracketLeft', metaKey: true, shiftKey: true } },
    { cmd: KeyboardCmd.NextTab, match: { code: 'BracketRight', metaKey: true, shiftKey: true } },
    { cmd: KeyboardCmd.Nothing, match: { code: 'KeyB', metaKey: true, shiftKey: false } },
  ]
  const listenerId = addKeyboardCmdListener(matchers, (keyboardCmd) => {
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
  })
  onCleanup(() => removeKeyboardCmdListener(listenerId))

  let iframeParent: HTMLDivElement | undefined
  let activeIframe: HTMLIFrameElement | undefined

  createEffect(() => {
    // Manage lifecycle of iframes.
    // 1. don't set iframe#src after creation (it triggers a page reload and loses scroll state)
    // 2. set src query's tabId so children can identify themselves
    if (iframeParent) {
      const nowActive = renderTabIframes(iframeParent, tabs.All, tabs.Current)
      if (nowActive && nowActive?.getAttribute('id') != activeIframe?.getAttribute('id')) {
        // Iframe changed. If the focus was on the last iframe, keyboard commands will
        // happen there instead of the one the user is looking at.
        nowActive.focus()
      }
      activeIframe = nowActive
    } else {
      // so far the createEffect runs after the function has returned JSX
      console.error('no iframeParent. Need setTimeout?')
    }
  })

  const keypressListener = makeKeypressListener((e: CustomEvent) => {
    activeIframe?.contentWindow?.dispatchEvent(e)
  })
  window.addEventListener('keypress', keypressListener)
  onCleanup(() => window.removeEventListener('keypress', keypressListener))

  window.addEventListener(OtherWindowKeypressEvent, otherWindowListener)
  onCleanup(() => window.removeEventListener(OtherWindowKeypressEvent, otherWindowListener))

  return (
    <div class={`columns is-gapless ${styles.browser}`}>

      {/* sidebar for tabs */}
      <div class={`column is-narrow ${styles.tabColumn}`}>
        <aside class={`menu ${styles.tabList}`}>
          <ul class="menu-list">
            <For each={tabs.All}>
              {(item) =>
                <li class="is-family-monospace">
                  <a
                    class={styles.tabMenuItem}
                    classList={{ [styles.isActiveAlt]: tabs.Current === item.Id }}
                    onclick={() => {
                      selectTab(item.Id)
                    }}>
                    <div class={styles.title}>{item.Title}</div>
                    <div class={styles.namespace}>{item.K8sNamespace}</div>
                    <div class={styles.context}>{item.K8sContext}</div>
                    <div
                      class={styles.tabClose}
                      onclick={(e: Event) => {
                        e.stopPropagation()
                        closeTab(item.Id)
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
                onClick={newTab}>
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

const renderTabIframes = (iframeParent: Element, all: Array<desktop.Tab>, current: string): HTMLIFrameElement | undefined => {

  const allFrames = iframeParent.querySelectorAll(`iframe`)

  const frameById: { [key: string]: HTMLIFrameElement } = {}
  allFrames.forEach((iframe) => {
    const id = iframe.getAttribute('id')
    if (id) {
      frameById[id] = iframe
    } else {
      console.error('unexpected values id, iframe', id, iframe)
    }
  })

  const tabsById: { [key: string]: desktop.Tab } = {}
  if (all) {
    all.forEach((t) => tabsById[t.Id] = t)
  }

  // Changes required
  const toCreate: Array<desktop.Tab> = _.filter(tabsById, (t) => frameById[t.Id] == undefined)
  const toDelete: Array<string> = _.filter(Object.keys(frameById), (id) => tabsById[id] == undefined)

  toCreate.forEach(t => {
    const newIframe = document.createElement('iframe')
    newIframe.setAttribute('id', t.Id)
    newIframe.classList.add(styles.content)
    newIframe.setAttribute('src', pathWithTabId(t.Path, t.Id))
    newIframe.onload = () => console.log('tab frame onload')
    iframeParent.appendChild(newIframe)
  });

  toDelete.forEach(id => {
    iframeParent.removeChild(frameById[id])
  })

  // Only update visibility. Never update iframe#src.
  // Since only one iframe is visible at a time, order doesn't matter.
  let activeIframe: HTMLIFrameElement | undefined
  Object.entries(frameById).forEach(([id, iframe]) => {
    if (id == current) {
      activeIframe = iframe
      if (iframe.classList.contains(styles.inactive)) {
        iframe.classList.remove(styles.inactive)
      }
    }
    if (id != current && !iframe.classList.contains(styles.inactive)) {
      iframe.classList.add(styles.inactive)
    }
  });

  console.log('activeIframe set to', activeIframe?.getAttribute('id'))
  return activeIframe
}


export default App;
