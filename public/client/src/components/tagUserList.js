import moment from 'moment';
import { useState, useEffect, useRef } from 'react';
import { Input, Tag, Popconfirm, AutoComplete, message } from 'antd';
import { PlusOutlined, CloseOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/auth';

export default function TagUserList (props) {
    const { value: tags, disabled, onChange, size, addButtonText, closeText } = props;
    const { callApi } = useAuth();
    const [data, setData] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [inputVisible, setInputVisible] = useState(false);

    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [inputVisible]);

    function showInput () {
        if(!disabled) {
            setInputVisible(true);
        }
    }

    function hideInput () {
        setInputValue('');
        setInputVisible(false);
    }

    function handleClose (removedTag) {
        onChange(removedTag._id, 'delete');
    }

    async function getItemsAsync (searchValue) {
        if (searchValue) {
            setInputValue(searchValue);
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

    function renderTag (tag) {
        return <Link to={`/user/${tag._id}`}>
            {tag.lastName} {tag.firstName} {tag.patronymic}
        </Link>
    }

    function renderResult (users) {
        return users.map(user => {
            return {
                    options: [
                        {
                            value: user._id,
                            label: (
                                <span
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
                                </span>
                            ),
                            userdata: user
                        }
                    ]
                };
            }
        );
    }

    function clearStates (_id) {
        setData([]);
        setInputValue('');
    }

    function onSelect (_id, options) {
        setInputValue('');
        setInputVisible(false);
        onChange(_id, 'add');
    }

    return (
        <div>
            {
                tags.map(tag => 
                    <Tag
                        color='blue'
                        className='edit-tag'
                        key={tag._id}
                        closable={true}
                        closeIcon={(
                            <Popconfirm
                                placement='top'
                                title={closeText}
                                onConfirm={() => handleClose(tag)}
                                okText='Так'
                                cancelText='Ні'
                                disabled={disabled}
                            >
                                <CloseOutlined />
                            </Popconfirm>
                        )}
                    >
                        <span>
                            {renderTag(tag)}
                        </span>
                    </Tag>)
            }
            {
                inputVisible && (
                    <AutoComplete
                        ref={inputRef}
                        dropdownMatchSelectWidth={false}
                        dropdownStyle={{ width: 100 }}
                        placeholder='Пошук...'
                        onSearch={getItemsAsync}
                        options={data}
                        onSelect={onSelect}
                        value={inputValue}
                        dropdownClassName='search-result'
                        className='search-user-tag-input'
                        disabled={disabled}
                        onBlur={hideInput}
                    >
                        <Input suffix={<UserOutlined />} />
                    </AutoComplete>
                )
            }
            {
                !inputVisible && (!size || size > tags.length) && (
                    <Tag className={`site-tag-plus${disabled ? '-disabled' : ''}`} onClick={showInput}>
                        <PlusOutlined />
                        <span>{addButtonText}</span>
                    </Tag>
                )
            }
        </div>
    );
}