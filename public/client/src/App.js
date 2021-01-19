import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
// pages
import Users from './pages/users';
import User from './pages/user';
import AddUser from './pages/addUser';
import Calendar from './pages/calendar';
import Login from './pages/login';
import NotFound from './pages/notFound';
// components
import HeaderMenu from './components/headerMenu';
import PrivateRoute from './components/privatRout';

export default function App() {
    return (
        <Router>
            <HeaderMenu />
            <Switch>
                <Route exact path='/login'>
                    <Login />
                </Route>
                <PrivateRoute exact path='/'>
                    <Users />
                </PrivateRoute>
                <PrivateRoute exact path='/user/add'>
                    <AddUser />
                </PrivateRoute>
                <PrivateRoute exact path='/user/:_id'>
                    <User />
                </PrivateRoute>
                <PrivateRoute exact path='/calendar'>
                    <Calendar />
                </PrivateRoute>
                <PrivateRoute path='*'>
                    <NotFound />
                </PrivateRoute>
            </Switch>
        </Router>
    );
}
