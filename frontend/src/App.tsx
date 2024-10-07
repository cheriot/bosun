import type { Component, Accessor } from 'solid-js';
import { createResource, Show } from "solid-js"
import { ParentProps } from 'solid-js';
import { createSignal, createContext, useContext, For } from "solid-js";

import type { ResourceReturn, ResourceOptions } from "solid-js"

import styles from './App.module.css';

import { desktop } from '../wailsjs/go/models';
import { Tabs, SelectTab, CloseTab, NewTab } from '../wailsjs/go/desktop/FrontendApi';

const App: Component = () => {

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
    console.log('closeTab')
    CloseTab(id).then(mutate)
  }

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
