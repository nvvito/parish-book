import moment from 'moment';
import { useState } from 'react';
import { AutoComplete, Input, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/auth';

export default function Search () {
    const { token, callApi } = useAuth();

    const [data, setData] = useState([]);
    const [value, setValue] = useState('');

    async function getItemsAsync (searchValue) {
        if (searchValue) {
            setValue(searchValue);
            callApi(`/api/user/search?text=${searchValue}`, 'GET', null, (err, data) => {
                if (err) {
                    message.error('Помилка пошуку!');
                } else {
                    setData(renderResult(data.message))
                }
            });
        } else {
            clearStates();
        }
    }

    function renderResult (users) {
        return users.map(user => {
            return {
                    options: [
                        {
                            value: user._id,
                            label: (
                                <Link
                                    className={`search-item gender-${user.gender}`}
                                    to={`/user/${user._id}`}
                                >
                                    <div className='search-item-name'>
                                        <span>{`Прізвище: `}</span>
                                        <span>{user.lastName}</span>
                                    </div>
                                    <div className='search-item-name'>
                                        <span>{`Ім'я: `}</span>
                                        <span>{user.firstName}</span>
                                    </div>
                                    <div className='search-item-name'>
                                        <span>{`По батькові: `}</span>
                                        <span>{user.patronymic}</span>
                                    </div>
                                    <div className='search-item-age'>
                                        <span>{`Вік: `}</span>
                                        <span>{moment.utc().startOf('day').diff(moment.utc(user.birthday).startOf('day'), 'years')}</span>
                                    </div>
                                </Link>
                            )
                        }
                    ]
                };
            }
        );
    }

    function clearStates (_id) {
        setData([]);
        setValue('');
    }

    return (
        <div>
            <AutoComplete
                dropdownMatchSelectWidth={false}
                dropdownStyle={{ width: 100 }}
                placeholder='Введіть ПІБ...'
                onSearch={getItemsAsync}
                options={data}
                onSelect={clearStates}
                value={value}
                dropdownClassName='search-result'
                className='search-input'
                disabled={!token}
            >
                <Input suffix={<SearchOutlined />} />
            </AutoComplete>
        </div>
    );
}
