import moment from 'moment';
import 'moment/locale/uk'
import { useState, useEffect } from 'react';
import { Calendar, ConfigProvider, Spin, message, Modal } from 'antd';
import locale from 'antd/es/locale/uk_UA';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../services/auth';
import Birthday from '../icons/birthday';
import Marriage from '../icons/marriage';

export default function CalendarOfEvents() {
    const history = useHistory();
    const { callApi } = useAuth();
    const [dateRange, setDateRange] = useState(calculateDateRange());
    const [date, setDate] = useState(moment.utc());
    const [load, setLoad] = useState(false);
    const [events, setEvents] = useState({ users: [], families: [] });

    useEffect(() => {
        setLoad(true);
        callApi(`/api/event?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, 'GET', null, (err, data) => {
            if (err) {
                setLoad(false);
                message.error('Помилка при завантаженні даних!')
            } else {
                setEvents(data.message);
                setLoad(false);
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange.startDate, dateRange.endDate])

    function calculateDateRange (currentDate = moment.utc()) {
        const startDate = moment.utc(currentDate).startOf('month');
        const endDate    = moment.utc(currentDate).endOf('month');

        return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    }

    function getListData(currentDate) {
        const users = events.users.filter(user => user.day === moment.utc(currentDate).date() && user.month === moment.utc(currentDate).month() + 1);
        const families = events.families.filter(family => family.day === moment.utc(currentDate).date() && family.month === moment.utc(currentDate).month() + 1);
        const count = users.length + families.length;
        const data = { users, families, count }

        return data
    }

    function onPanelChangeDate (currentDate) {
        setDateRange(calculateDateRange(currentDate));
        setDate(currentDate);
    }

    function onChangeDate (currentDate) {
        onPanelChangeDate(currentDate);

        if (currentDate.year() === date.year()) {
            const listData = getListData(currentDate);
            if (listData.count) {
                showModal(currentDate, listData);
            }
        }
    }

    function onSelectDate (currentDate) {
        if (currentDate.isSame(date)) {
            const listData = getListData(currentDate);
            if (listData.count) {
                showModal(currentDate, listData);
            }
        }
    }

    function showModal (currentDate, listData) {
        Modal.info({
            title: currentDate.format('DD-MM-YYYY'),
            content: (
                <div className='modal-events-list'>
                    {
                        listData.users.length
                            ? <>
                                <div>Дні народження:</div>
                                <ol>
                                    {
                                        listData.users.map(user => <li key={user._id}>
                                            <div>
                                                <span onClick={() => goToUser(user._id)}>
                                                    {`${user.lastName} ${user.firstName} ${user.patronymic}`}
                                                </span>
                                                <span>
                                                    {`(${moment.utc(currentDate).startOf('day').diff(moment.utc(user.birthday).startOf('day'), 'years')}p)`}
                                                </span>
                                            </div>
                                        </li>)
                                    }
                                </ol>
                            </>
                            : ''
                    }
                    {
                        listData.families.length
                            ? <>
                                <div>Річниці шлюбу:</div>
                                <ol>
                                    {
                                        listData.families.map(family => <li key={family._id}>
                                            <div>
                                                <span onClick={() => goToUser(family.father._id)}>
                                                    {`${family.father.lastName} ${family.father.firstName} ${family.father.patronymic}`}
                                                </span>
                                                <span>
                                                    та
                                                </span>
                                                <span onClick={() => goToUser(family.mother._id)}>
                                                    {`${family.mother.lastName} ${family.mother.firstName} ${family.mother.patronymic}`}
                                                </span>
                                                <span>
                                                    {`(${moment.utc(currentDate).startOf('day').diff(moment.utc(family.marriage).startOf('day'), 'years')}p)`}
                                                </span>
                                            </div>
                                        </li>)
                                    }
                                </ol>
                            </>
                            : ''
                    }
                </div>
            )
        });
    }

    function goToUser (_id) {
        Modal.destroyAll();
        history.push(`/user/${_id}`);
    }

    function dateCellRender(currentDate) {
        const listData = getListData(currentDate);

        return listData.users.length || listData.families.length
            ? <div className='events-list'>
                {
                    listData.users.length
                        ? <div className='events-box events-birthday'>
                            {listData.users.length}
                            <Birthday />
                        </div>
                        : ''
                }
                {
                    listData.families.length
                        ? <div className='events-box events-marriage'>
                            {listData.families.length}
                            <Marriage />
                        </div>
                        : ''
                }
            </div>
            : '';
    }

    function disabledDate (currentDate) {
        return date.month() !== currentDate.month();
    }

    return (
        <div className='page-content'>
            <h1>Календар свят:</h1>
            {
                load
                    ? <div className='load-events'>
                        <Spin
                            size='large'
                            tip='Завантаження подій...'
                        />
                    </div>
                    : <ConfigProvider locale={locale}>
                        <Calendar
                            onPanelChange={onPanelChangeDate}
                            onChange={onChangeDate}
                            onSelect={onSelectDate}
                            className='calendar-of-events'
                            dateCellRender={dateCellRender}
                            value={date}
                            disabledDate={disabledDate}
                        />
                    </ConfigProvider>
            }
        </div>
    );
}
