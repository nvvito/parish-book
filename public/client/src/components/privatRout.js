import { Route, Redirect } from 'react-router-dom';
import { useAuth } from '../services/auth';

export default function PrivateRoute({ children, ...rest }) {
    const auth = useAuth();

    return (
        <Route
            {...rest}
            render={({ location }) =>
                auth.token ? (
                    children
                ) : (
                        <Redirect
                            to={{
                                pathname: '/login',
                                state: { from: location }
                            }}
                        />
                    )
            }
        />
    );
}
