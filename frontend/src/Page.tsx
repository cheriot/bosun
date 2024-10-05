/* @refresh reload */
import type { Component, Accessor } from 'solid-js';
import { render } from 'solid-js/web';

import './index.css';

const Page: Component = () => {
    return (
        <div>page component content</div>
    )
}

render(() => <Page />, document.getElementById('root') as HTMLElement);