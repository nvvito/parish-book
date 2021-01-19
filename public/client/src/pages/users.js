import moment from 'moment';
import { useState, useEffect, Fragment } from 'react';
import { Anchor, List, message, Empty, BackTop } from 'antd';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import Birthday from '../icons/birthday';
import MarriageIcon from '../icons/marriage';
import Child from '../icons/child';

const { Link: AnchorLink } = Anchor;

export default function Users () {
    const { callApi } = useAuth();

    const [data, setData] = useState([]);
    const [load, setLoad] = useState(false);

    useEffect(() => {
        setLoad(true);
        callApi(`/api/user?populated=true`, 'GET', null, (err, data) => {
            if (err) {
                setLoad(false);
                message.error('Помилка при завантаженні даних!')
            } else {
                setData(groupingUsersAlphabetically(data.message));
                setLoad(false);
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function groupingUsersAlphabetically (users) {
        const alArray = [
            { label: 'A', users: [] },
            { label: 'Б', users: [] },
            { label: 'В', users: [] },
            { label: 'Г', users: [] },
            { label: 'Ґ', users: [] },
            { label: 'Д', users: [] },
            { label: 'Е', users: [] },
            { label: 'Є', users: [] },
            { label: 'Ж', users: [] },
            { label: 'З', users: [] },
            { label: 'І', users: [] },
            { label: 'Ї', users: [] },
            { label: 'Й', users: [] },
            { label: 'К', users: [] },
            { label: 'Л', users: [] },
            { label: 'М', users: [] },
            { label: 'Н', users: [] },
            { label: 'О', users: [] },
            { label: 'П', users: [] },
            { label: 'Р', users: [] },
            { label: 'С', users: [] },
            { label: 'Т', users: [] },
            { label: 'У', users: [] },
            { label: 'Ф', users: [] },
            { label: 'Х', users: [] },
            { label: 'Ц', users: [] },
            { label: 'Ч', users: [] },
            { label: 'Ш', users: [] },
            { label: 'Щ', users: [] },
            { label: 'Ю', users: [] },
            { label: 'Я', users: [] },
        ];

        users.forEach((user) => {
            const key = user.lastName[0].toUpperCase();

            const letterElement = alArray.find(letter => letter.label === key);
            if(!letterElement) {
                alArray.push({ label: key, users: [user] });
            } else {
                letterElement.users.push(user);
            }
        });

        return alArray.sort((a, b) => a.label > b.label);
    }

    return (
        <div className='page-content'>
            <h1>Список парафіян:</h1>
            <div className='user-page'>
                <Anchor>
                    {
                        data.length
                        ? data.map(letter => (
                            <AnchorLink key={letter.label} href={`#${letter.label}`} title={letter.label} className='anchor-list' />
                        ))
                        : ''
                    }
                </Anchor>
                <div className='user-list'>
                    {
                        data.reduce((sum, letter) => sum+= letter.users.length, 0)
                            ? data.map(letter => 
                                letter.users.length
                                    ?
                                    <Fragment key={letter.label}>
                                        <div
                                            className='list-letter'
                                            id={letter.label}
                                        >
                                            {letter.label}
                                        </div>
                                        <List
                                            bordered={false}
                                            dataSource={letter.users}
                                            loading={load}
                                            renderItem={item => (
                                                <UserItem userData={item}/>
                                            )}
                                        />
                                    </Fragment>
                                    : ''
                            )
                            : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Список порожній...' />
                    }
                </div>
            </div>
            <BackTop />
        </div>
    );
}

function UserItem ({ userData }) {
    const { gender, lastName, firstName, patronymic, birthday, partner, marriageDate, childrenCount } = userData;

    return (
        <List.Item className={`user-list-item gender-${gender}`}>
            <div>
                <div>
                    <Link to={`/user/${userData._id}`}>
                        {`${lastName} ${firstName} ${patronymic}`}
                    </Link>
                </div>
                <div>
                    <>
                        {moment.utc().startOf('day').diff(moment.utc(birthday).startOf('day'), 'years')}p
                        <Birthday />
                    </>
                </div>
                <div>
                    {
                        partner
                            ? <>
                                {moment.utc().startOf('day').diff(moment.utc(marriageDate).startOf('day'), 'years')}p
                                <MarriageIcon />
                            </>
                            : ''
                    }
                </div>
                <div>
                    {
                        childrenCount
                            ? <>
                                {childrenCount}
                                <Child />
                            </>
                            : ''
                    }
                </div>
            </div>
        </List.Item>
    );
}