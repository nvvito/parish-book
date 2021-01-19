import { Link } from 'react-router-dom';
import { Menu, Dropdown } from 'antd';
import { TeamOutlined, UserAddOutlined, CalendarOutlined, MenuOutlined, LogoutOutlined } from '@ant-design/icons';
import Search from './search';
import { useAuth } from '../services/auth'

export default function HeaderMenu () {
    const { token, logout } = useAuth();

    function clickLogout () {
        logout('andLocal');
    }

    return (
        <div className='header-menu'>
            <div className='dropdow-header-menu'>
                <DropdownMenu />
            </div>
            <div className='main-header-menu'>
                <Link to='/'>
                    <TeamOutlined />
                    Парафіяни
                </Link>
            </div>
            <div className='main-header-menu'>
                <Link to='/user/add'>
                    <UserAddOutlined />
                    Додати парафіянина
                </Link>
            </div>
            <div className='main-header-menu'>
                <Link to='/calendar' className='main-header-menu'>
                    <CalendarOutlined />
                    Календар
                </Link>
            </div>
            <div className='search-header-menu'>
                <Search />
            </div>
            {
                token && (
                    <div className='logout-header-menu' onClick={clickLogout}>
                        <LogoutOutlined />
                        Вихід
                    </div>
                )
            }
        </div>
    );
}

const menu = (
    <Menu>
        <Menu.Item key='1'>
            <Link to='/'>
                <TeamOutlined />
                Парафіяни
            </Link>
        </Menu.Item>
        <Menu.Item key='2'>
            <Link to='/user/add'>
                <UserAddOutlined />
                Додати парафіянина
            </Link>
        </Menu.Item>
        <Menu.Item key='3'>
            <Link to='/calendar'>
                <CalendarOutlined />
                Календар
            </Link>
        </Menu.Item>
    </Menu>
  );

function DropdownMenu () {
    return (
        <Dropdown overlay={menu} trigger={['click']}>
            <div>
                <MenuOutlined />
            </div>
        </Dropdown>
    );
}
