import type { Component, Accessor } from 'solid-js';
import { createResource, Show } from "solid-js"
import { ParentProps } from 'solid-js';
import { createSignal, createContext, useContext, For } from "solid-js";

import type { ResourceReturn, ResourceOptions } from "solid-js"

import styles from './App.module.css';

import { desktop } from '../wailsjs/go/models';
import { Tabs, SelectTab, NewTab } from '../wailsjs/go/desktop/FrontendApi';

const App: Component = () => {

  const initialTabs = { all: [] }
  const [tabs, { mutate }] = createResource(() => {
    return Tabs()
  }, { initialValue: initialTabs })

  const selectTab = (id: string) => {
    SelectTab(id).then(mutate)
  }

  const newTab = () => {
    NewTab().then(mutate)
  }

  return (
    <TabbedBrowser tabs={tabs} selectTab={selectTab} newTab={newTab} />
  );
};


interface TabbedBrowserProps {
  tabs: Accessor<desktop.Tabs>
  selectTab: (id: string) => void
  newTab: () => void
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
                    onClick={[props.selectTab, item.Id]}>
                    <div>{item.K8sContext}</div> <div>{item.K8sNamespace}</div>
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
    </div>
  )
}


export default App;
