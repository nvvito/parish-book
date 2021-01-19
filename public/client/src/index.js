import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import 'antd/dist/antd.css'
import { ProvideAuth } from './services/auth'
import App from './App';

ReactDOM.render(
    <ProvideAuth>
        <App />
    </ProvideAuth>,
    document.getElementById('root')
);
