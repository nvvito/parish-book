import moment from 'moment';
import 'moment/locale/uk'
import { useState } from 'react';
import { Input, DatePicker, Radio, ConfigProvider, Button, Popconfirm, message, notification } from 'antd';
import { SaveOutlined, ClearOutlined, CalendarOutlined } from '@ant-design/icons';
import locale from 'antd/es/locale/uk_UA';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../services/auth';
import FormItem from '../components/formItem';
import TagList from '../components/tagList';
import Birthday from '../icons/birthday';

export default function AddUser () {
    const initData = {
        lastName: '',
        firstName: '',
        patronymic: '',
        birthday: null,
        gender: '',
        phones: [],
        address: ''
    };

    const history = useHistory();
    const { callApi } = useAuth();
    const [data, setData] = useState(initData);
    const [load, setLoad] = useState(false);

    function changeInput (event) {
        const value = event.target.value;
        const field = event.target.id;
        const newData = { ...data };
        newData[field] = value;
        setData(newData);
    }

    function changeDate (date) {
        setData({ ...data, birthday: moment.utc(date) });
    }

    function changeGender (event) {
        setData({ ...data, gender: event.target.value });
    }

    function changePhones (phones) {
        setData({ ...data, phones: phones });
    }

    function clearData () {
        setData(initData);
    }

    function saveUser () {
        setLoad(true);
        callApi(`/api/user`, 'POST', data, (err, data) => {
            if (err) {
                setLoad(false);
                message.error('Помилка при завантаженні даних!');
            } else {
                setLoad(false);
                notification.success({

                    duration: 6,
                    message: 'Збережено',
                    description: (
                        <span>
                            {'Парафіянин '}
                            <span className='notification-result' onClick={() => history.push(`/user/${data.message._id}`)}>
                                {data.message.lastName} {data.message.firstName} {data.message.patronymic}
                            </span>
                            {' успішно доданий'} 
                        </span>
                    )
                });

                history.push(`/`);
            }
        });
    }

    function disableSaveButton () {
        const { lastName, firstName, patronymic, birthday, gender } = data;

        return !(lastName && firstName && patronymic && birthday && gender);
    }

    function calculateAge () {
        return moment.utc().startOf('day').diff(data.birthday.startOf('day'), 'years');
    }

    function calculateDaysToNextBirthday () {
        const currentDate = moment.utc().startOf('day');
        const birthdayDateInCurrentYear = moment.utc(data.birthday).startOf('day').year(currentDate.year());
        const numberOfDaysToNextBirthday = currentDate.isBefore(birthdayDateInCurrentYear)
            ? birthdayDateInCurrentYear.diff(currentDate, 'days')
            : birthdayDateInCurrentYear.add(1, 'years').diff(currentDate, 'days');

        return numberOfDaysToNextBirthday;
    }

    return (
        <div className='page-content'>
            <h1>Додати нового парафіянина:</h1>
            <div className='user-form'>
                <div className='user-name'>
                    <FormItem
                        label='Прізвище'
                        required={true}
                        value={data.lastName}
                    >
                        <Input
                            id='lastName'
                            onChange={changeInput}
                            placeholder='Внесіть прізвище...'
                            disabled={load}
                        />
                    </FormItem>
                    <FormItem
                        label={`Ім'я`}
                        required={true}
                        value={data.firstName}
                    >
                        <Input
                            id='firstName'
                            onChange={changeInput}
                            placeholder={`Внесіть ім'я...`}
                            disabled={load}
                        />
                    </FormItem>
                    <FormItem
                        label='По батькові'
                        required={true}
                        value={data.patronymic}
                    >
                        <Input
                            id='patronymic'
                            onChange={changeInput}
                            placeholder='Внесіть по батькові...'
                            disabled={load}
                        />
                    </FormItem>
                </div>
                <div className='user-age'>
                    <ConfigProvider locale={locale}>
                        <FormItem
                            label='Дата народження'
                            required={true}
                            value={data.birthday}
                        >
                            <DatePicker
                                id='birthday'
                                onChange={changeDate}
                                placeholder='Внесіть дату народження...'
                                disabled={load}
                                format='DD-MM-YYYY'
                            />
                        </FormItem>
                    </ConfigProvider>
                    {
                        data.birthday && (
                            <div className='calculated-user-age'>
                                <FormItem
                                    label='Повних років'
                                >
                                    <div className='calculated-user-age-item'>
                                        <span>
                                            {calculateAge()}
                                        </span>
                                        <span>
                                            <Birthday />
                                        </span>
                                    </div>
                                </FormItem>
                                <FormItem
                                    label='ДН через'
                                >
                                    <div className='calculated-user-age-item'>
                                        <span>
                                            {calculateDaysToNextBirthday()}
                                        </span>
                                        <CalendarOutlined />
                                    </div>
                                </FormItem>
                            </div>
                        )
                    }
                </div>
                <div className='user-gender'>
                    <FormItem
                        label='Стать'
                        required={true}
                        value={data.gender}
                    >
                        <Radio.Group
                            onChange={changeGender}
                            disabled={load}
                        >
                            <Radio.Button value='man'>Чоловік</Radio.Button>
                            <Radio.Button value='woman'>Жінка</Radio.Button>
                        </Radio.Group>
                    </FormItem>
                </div>
                <div className='user-phone'>
                    <FormItem
                        label='Телефони'
                        value={data.phones}
                        popover={`Щоб додати номер телефону, необхідно його ввести в форматі +380ХХХХХХХХХ та натиснути клавішу 'enter'`}
                    >
                        <TagList
                            onChange={changePhones}
                            disabled={load}
                            addButtonText='Додати телефон'
                            renderTag={(tag) => (
                                <a href={`tel:${tag}`}>{tag}</a>
                            )}
                        />
                    </FormItem>
                </div>
                <div className='user-address'>
                    <FormItem
                        label='Адреса'
                        value={data.address}
                    >
                        <Input.TextArea
                            id='address'
                            onChange={changeInput}
                            placeholder='Внесіть адресу...'
                            autoSize
                            disabled={load}
                        />
                    </FormItem>
                </div>
                <div className='user-button'>
                    <Popconfirm
                        placement='top'
                        title={'Ви дійсно хочете очистити форму?'}
                        onConfirm={clearData}
                        okText='Так'
                        cancelText='Ні'
                        disabled={load}
                    >
                        <Button
                            type='default'
                            icon={<ClearOutlined />}
                            disabled={load}
                        >
                            Очистити форму
                        </Button>
                    </Popconfirm>
                    <Popconfirm
                        placement='top'
                        title={'Зберегти парафіянина? Змінити стать неможливо!'}
                        onConfirm={saveUser}
                        okText='Так'
                        cancelText='Ні'
                        disabled={disableSaveButton() || load}
                    >
                        <Button
                            type='primary'
                            icon={<SaveOutlined />}
                            disabled={disableSaveButton()}
                            loading={load}
                        >
                            Зберегти парафіянина
                        </Button>
                    </Popconfirm>
                </div>
            </div>
        </div>
    );
}
