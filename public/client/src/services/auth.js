import axios from 'axios';
import { createContext, useContext, useState } from 'react';
import { message } from 'antd';

const authContext = createContext();

function useProvideAuth() {
    const [token, setToken] = useState(getTokenFromlocalStorage());

    function setTokenTolocalStorage (token) {
        return localStorage.setItem('token', token);
    }

    function getTokenFromlocalStorage () {
        return localStorage.getItem('token');
    }

    function removeTokenFromLocalStorage () {
        localStorage.removeItem('token');
    }

    function login (token, andLocal) {
        setToken(token);
        if (andLocal) {
            setTokenTolocalStorage(token);
        }
    }

    function logout (andLocal) {
        setToken(null);
        if (andLocal) {
            removeTokenFromLocalStorage();
        }
    }

    function getAuthHeader () {
        return {
            'parish-auth': `parish-member ${token}`
        }
    }

    function isAuthError (errorMessage) {
        return  ['Token is not valid', 'Auth bearer error', 'Auth token is not supplied'].includes(errorMessage);
    }

    async function callApi (url, method, body, cb) {
        try {
            const { data } = await axios({
                url,
                method,
                headers: getAuthHeader(),
                data: body
            });
            cb(null, data);
        } catch(err) {
            if (err.response && err.response.data && isAuthError(err.response.data.message)) {
                logout('andLocal');
                message.error('Необхідно пройти авторизацію!')
            } else {
                cb(err, null);
            }
        }
    }

    return {
        token,
        callApi,
        login,
        logout
    };
}

export function ProvideAuth({ children }) {
    const auth = useProvideAuth();
    return (
        <authContext.Provider value={auth}>
            {children}
        </authContext.Provider>
    );
}

export function useAuth() {
    return useContext(authContext);
}
