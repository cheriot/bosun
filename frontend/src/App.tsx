import type { Component } from 'solid-js';
import { createSignal } from 'solid-js';
import { createResource } from "solid-js"
import type { ResourceReturn, ResourceOptions } from "solid-js"

import logo from './logo.svg';
import styles from './App.module.css';

import { Greet } from '../wailsjs/go/desktop/FrontendApi';

const [greeting2] = createResource(() => {
  return Greet('Chaya')
}, { initialValue: 'who dis' })

const App: Component = () => {
  const [greeting, setGreeting] = createSignal('');
  Greet('Chris').
    then((result: string) => {
      setGreeting(result)
    })

  return (
    <div>
      <header class={`section has-text-centered ${styles.header}`}>
        <img src={logo} class={styles.logo} alt="logo" />
        <a
          class={styles.link}
          href="https://github.com/solidjs/solid"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn Solid
        </a>
        <Counter />
      </header>

      <div class="columns is-gapless">
        <div class={`column is-narrow ${styles.column1}`}>
          <aside class="menu">
            <ul class="menu-list">
              <li><a class={`is-active ${styles.tabMenuItem}`}>Dashboard</a></li>
              <li><a class={styles.tabMenuItem}>Customers</a></li>
            </ul>
          </aside>
        </div>

        <div class={`column ${styles.column2}`}>
          <p>
            {greeting()}
          </p>
          <p>
            {greeting2()}
          </p>
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
        </div>
      </div>
    </div>
  );
};

function Counter() {
  const [count, setCount] = createSignal(0);
  const increment = () => setCount((prev) => prev + 1);

  return (
    <div>
      <span>Count: {count()}</span>{" "}
      {/* Only `count()` is updated when the button is clicked. */}
      <button type="button" class="button is-primary" onClick={increment}>
        Increment
      </button>
    </div>
  );
}

export default App;
