/* @refresh reload */
import { render } from 'solid-js/web';

import './index.css';
import Browser from './Browser';

render(() => <Browser />, document.getElementById('root') as HTMLElement);
