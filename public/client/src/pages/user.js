import moment from 'moment';
import 'moment/locale/uk'
import { useState, useEffect } from 'react';
import { Input, DatePicker, Radio, Spin, Result, ConfigProvider, Button, Popconfirm, message, notification } from 'antd';
import { SaveOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import locale from 'antd/es/locale/uk_UA';
import { useHistory, useParams } from 'react-router-dom';
import { useAuth } from '../services/auth';
import FormItem from '../components/formItem';
import TagList from '../components/tagList';
import TagUserList from '../components/tagUserList';
import Birthday from '../icons/birthday';
import Marriage from '../icons/marriage'

export default function AddUser () {
    const initData = {
        user: {
            _id: null,
            lastName: '',
            firstName: '',
            patronymic: '',
            birthday: null,
            gender: '',
            phones: [],
            address: ''
        },
        parentFamily: {
            _id: null,
            children: [],
            father: null,
            mother: null
        },
        userFamily: {
            _id: null,
            children: [],
            partner: null,
            marriage: null
        }
    };

    const history = useHistory();
    const { _id } = useParams();
    const { callApi } = useAuth();
    const [data, setData] = useState(initData);
    const [firstLoad, setFirstLoad] = useState(false);
    const [load, setLoad] = useState(false);
    const [notFind, setNotFind] = useState(false);
    const [marriageLoad, setMarriageLoad] = useState(false);

    useEffect(() => {
        loadData(setFirstLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [_id]);

    function changeInput (event) {
        const value = event.target.value;
        const field = event.target.id;
        const newData = { ...data };
        newData.user[field] = value;
        setData(newData);
    }

    function changeDate (date) {
        setData({ ...data, user: { ...data.user, birthday: date ? moment.utc(date) : null } });
    }

    function changeGender (event) {
        setData({ ...data, user: { ...data.user, gender: event.target.value } });
    }

    function changePhones (phones) {
        setData({ ...data, user: { ...data.user, phones: phones } });
    }

    function changeMarriageDate (date) {
        setData({ ...data, userFamily: { ...data.userFamily, marriage: date ? moment.utc(date) : null } });
    }

    function deleteUser () {
        setLoad(true);
        callApi(`/api/user/${data.user._id}`, 'DELETE', null, (err, result) => {
            if (err) {
                setLoad(false);
                message.error('Помилка при видаленні парафіянина!');
            } else {
                setLoad(false);
                message.success('Парафіянина видалено успішно!');
                history.push(`/`);
            }
        });
    }

    function saveUser () {
        setLoad(true);
        callApi(`/api/user/${data.user._id}`, 'PUT', data.user, (err, result) => {
            if (err) {
                setLoad(false);
                message.error('Помилка при збереженні даних!');
            } else {
                setLoad(false);
                message.success('Дані збереженно успішно!');
            }
        });
    }

    function loadData (fnLoad) {
        fnLoad(true);
        callApi(`/api/user/${_id}?populated=true`, 'GET', null, (err, result) => {
            if (err) {
                if (err.response && err.response.data && err.response.data.message && err.response.data.message.includes('не знайдено')) {
                    setNotFind(true);
                } else {
                    message.error('Помилка при завантаженні даних!');
                }
                fnLoad(false);
            } else {
                const newData = { ...result.message };
                newData.user.birthday = moment.utc(newData.user.birthday);
                newData.parentFamily = newData.parentFamily || initData.userFamily;
                newData.userFamily = newData.userFamily || initData.userFamily;
                newData.userFamily.marriage = newData.userFamily.marriage ? moment.utc(newData.userFamily.marriage) : null;
                setData(newData);
                setNotFind(false);
                fnLoad(false);
            }
        });
    }

    function changeFamilyMember (memberId, relative, action, errorLabel, successLabel, gender = 'member') {
        const method = action === 'add' ? 'PUT' : 'DELETE';
        const errorMessage = `Помилка при ${action === 'add' ? 'додаванні' : 'видаленні'} ${errorLabel}!`;
        const successMessage = `${successLabel} ${action === 'add' ? 'додано' : 'видалено'} успішно!`;
        setLoad(true);
        callApi(`/api/family/user/${_id}/${relative}/${memberId}?gender=${gender}`, method, null, (err, result) => {
            if (err) {
                setLoad(false);
                if (err.response && err.response.data && err.response.data.message && err.response.data.message.includes('Помилка логіки')) {
                    notification.error({
                        duration: 6,
                        message: 'Помилка логіки!',
                        description: (
                            <span>
                                {'Причина: '}
                                <span className='notification-result'>
                                    {err.response.data.message.split('Причина: ').pop().split(')').shift()}
                                </span>
                            </span>
                        )
                    });
                } else {
                    message.error(errorMessage);
                }
            } else {
                message.success(successMessage);
                loadData(setLoad);
            }
        });
    }

    function saveMarriageDate () {
        setLoad(true);
        setMarriageLoad(true);
        callApi(`/api/family/${data.userFamily._id}/marriage`, 'PUT', { date: data.userFamily.marriage }, (err, result) => {
            if (err) {
                setLoad(false);
                setMarriageLoad(false);
                if (err.response && err.response.data && err.response.data.message && err.response.data.message.includes('Помилка логіки')) {
                    notification.error({
                        duration: 6,
                        message: 'Помилка логіки!',
                        description: (
                            <span>
                                {'Причина: '}
                                <span className='notification-result'>
                                    {err.response.data.message.split('Причина: ').pop().split(')').shift()}
                                </span>
                            </span>
                        )
                    });
                } else {
                    message.error('Помилка при збереженні дати шлюбу!');
                }
            } else {
                setLoad(false);
                setMarriageLoad(false);
                message.success('Дата шлюбу збереженно успішно!');
            }
        });
    }

    function deleteFromFamily (familyId) {
        setLoad(true);
        callApi(`/api/family/${familyId}/user/${data.user._id}`, 'DELETE', null,  (err, result) => {
            if (err) {
                setLoad(false);
                if (err.response && err.response.data && err.response.data.message && err.response.data.message.includes('Помилка логіки')) {
                    notification.error({
                        duration: 6,
                        message: 'Помилка логіки!',
                        description: (
                            <span>
                                {'Причина: '}
                                <span className='notification-result'>
                                    {err.response.data.message.split('Причина: ').pop().split(')').shift()}
                                </span>
                            </span>
                        )
                    });
                } else {
                    message.error('Помилка при видаленні парафіянина із сім\'ї!');
                }
            } else {
                message.success('Парафіянина успішно видалено із сім\'ї!');
                loadData(setLoad);
            }
        });
    }

    function disableSaveButton () {
        const { lastName, firstName, patronymic, birthday, gender } = data.user;

        return !(lastName && firstName && patronymic && birthday && gender);
    }

    function calculateAge (date) {
        return moment.utc().startOf('day').diff(moment.utc(date).startOf('day'), 'years');
    }

    function calculateDaysToNextBirthday (date) {
        const currentDate = moment.utc().startOf('day');
        const birthdayDateInCurrentYear = moment.utc(date).startOf('day').year(currentDate.year());
        const numberOfDaysToNextBirthday = currentDate.isBefore(birthdayDateInCurrentYear)
            ? birthdayDateInCurrentYear.diff(currentDate, 'days')
            : birthdayDateInCurrentYear.add(1, 'years').diff(currentDate, 'days');

        return numberOfDaysToNextBirthday;
    }

    return (
        <div className='page-content'>
            {
                notFind
                    ? <Result
                        status='404'
                        title='Парафіянина не знайдено...'
                    />
                    : <>
                        <h1>Інформація про парафіянина:</h1>
                        {
                            firstLoad
                                ? <div className='load-events'>
                                    <Spin
                                        size='large'
                                        tip='Завантаження даних парафіянина...'
                                    />
                                </div>
                                :  <>
                                    <div className='user-form'>
                                        <div className='user-name'>
                                            <FormItem
                                                label='Прізвище'
                                                required={true}
                                                value={data.user.lastName}
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
                                                value={data.user.firstName}
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
                                                value={data.user.patronymic}
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
                                                    value={data.user.birthday}
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
                                                data.user.birthday && (
                                                    <div className='calculated-user-age'>
                                                        <FormItem
                                                            label='Повних років'
                                                        >
                                                            <div className='calculated-user-age-item'>
                                                                <span>
                                                                    {calculateAge(data.user.birthday)}
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
                                                                    {calculateDaysToNextBirthday(data.user.birthday)}
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
                                                value={data.user.gender}
                                            >
                                                <Radio.Group
                                                    onChange={changeGender}
                                                    disabled={true}
                                                >
                                                    <Radio.Button value='man'>Man</Radio.Button>
                                                    <Radio.Button value='woman'>Woman</Radio.Button>
                                                </Radio.Group>
                                            </FormItem>
                                        </div>
                                        <div className='user-phone'>
                                            <FormItem
                                                label='Телефони'
                                                value={data.user.phones}
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
                                                value={data.user.address}
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
                                                title={'Ви дійсно хочете видалити парафіянина?'}
                                                onConfirm={deleteUser}
                                                okText='Так'
                                                cancelText='Ні'
                                                disabled={load}
                                            >
                                                <Button
                                                    type='default'
                                                    icon={<DeleteOutlined />}
                                                    disabled={load}
                                                    danger
                                                >
                                                    Видалити парафіянина
                                                </Button>
                                            </Popconfirm>
                                            <Popconfirm
                                                placement='top'
                                                title={'Зберегти зміни в даних парафіянина?'}
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
                                                    Зберегти зміни
                                                </Button>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                    <h1>Сім'я парафіянина:</h1>
                                    <div className='user-falily'>
                                        <div className='user-falily-partner'>
                                            <FormItem
                                                label={data.user.gender === 'man' ? 'Дружина' : 'Чоловік'}
                                                value={data.userFamily.partner ? [data.userFamily.partner] : []}
                                                popover={`Щоб додати парафіянина, необхідно його знайти ввівши ПІБ та натиснути на його картку`}
                                            >
                                                <TagUserList
                                                    onChange={(_id, action) => changeFamilyMember(_id, 'partner', action, data.user.gender === 'man' ? 'дружини' : 'чоловіка', data.user.gender === 'man' ? 'Дружину' : 'Чоловіка')}
                                                    disabled={load}
                                                    size={1}
                                                    addButtonText={data.user.gender === 'man' ? 'Додати дружину' : 'Додати чоловіка'}
                                                    closeText={`Видалити ${data.user.gender === 'man' ? 'дружину' : 'чоловіка'} із сім'ї?`}
                                                />
                                            </FormItem>
                                            <ConfigProvider locale={locale}>
                                                <FormItem
                                                    label='Дата шлюбу'
                                                    value={data.userFamily.marriage}
                                                >
                                                    <div className='marriage-date'>
                                                        <DatePicker
                                                            id='marriage'
                                                            value={data.userFamily.marriage}
                                                            onChange={changeMarriageDate}
                                                            placeholder='Внесіть дату народження...'
                                                            disabled={load || !data.userFamily.partner}
                                                            format='DD-MM-YYYY'
                                                        />
                                                        <Popconfirm
                                                            placement='top'
                                                            title={'Зберегти в дату шлюбу?'}
                                                            onConfirm={saveMarriageDate}
                                                            okText='Так'
                                                            cancelText='Ні'
                                                            disabled={load || !data.userFamily.partner}
                                                        >
                                                            <Button
                                                                icon={<SaveOutlined />}
                                                                size='middle'
                                                                disabled={load || !data.userFamily.partner}
                                                                loading={marriageLoad}
                                                            />
                                                        </Popconfirm>
                                                    </div>
                                                </FormItem>
                                            </ConfigProvider>
                                            {
                                                data.userFamily.marriage && (
                                                    <div className='calculated-family-age'>
                                                        <FormItem
                                                            label='Повних років'
                                                        >
                                                            <div className='calculated-family-age-item'>
                                                                <span>
                                                                    {calculateAge(data.userFamily.marriage)}
                                                                </span>
                                                                <span>
                                                                    <Marriage />
                                                                </span>
                                                            </div>
                                                        </FormItem>
                                                        <FormItem
                                                            label='Річниця через'
                                                        >
                                                            <div className='calculated-family-age-item'>
                                                                <span>
                                                                    {calculateDaysToNextBirthday(data.userFamily.marriage)}
                                                                </span>
                                                                <CalendarOutlined />
                                                            </div>
                                                        </FormItem>
                                                    </div>
                                                )
                                            }
                                        </div>
                                        <div className='user-falily-children'>
                                            <FormItem
                                                label='Діти'
                                                value={data.userFamily.children}
                                                popover={`Щоб додати парафіянина, необхідно його знайти ввівши ПІБ та натиснути на його картку`}
                                            >
                                                <TagUserList
                                                    onChange={(_id, action) => changeFamilyMember(_id, 'child', action, 'дитини', 'Дитину')}
                                                    disabled={load}
                                                    addButtonText='Додати дитину'
                                                    closeText={`Видалити дитину із сім'ї?`}
                                                />
                                            </FormItem>
                                        </div>
                                        <div className='user-falily-button'>
                                            <Popconfirm
                                                placement='top'
                                                title={'Ви дійсно хочете видалити парафіянина з сім\'ї?'}
                                                onConfirm={() => deleteFromFamily(data.userFamily._id)}
                                                okText='Так'
                                                cancelText='Ні'
                                                disabled={load || !data.userFamily._id}
                                            >
                                                <Button
                                                    type='default'
                                                    icon={<DeleteOutlined />}
                                                    disabled={load || !data.userFamily._id}
                                                    danger
                                                >
                                                    Видалити з сім'ї
                                                </Button>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                    <h1>Сім'я батьків:</h1>
                                    <div className='user-falily'>
                                        <div className='user-falily-parents'>
                                            <FormItem
                                                label='Батько'
                                                value={data.parentFamily.father ? [data.parentFamily.father] : []}
                                                popover={`Щоб додати парафіянина, необхідно його знайти ввівши ПІБ та натиснути на його картку`}
                                            >
                                                <TagUserList
                                                    onChange={(_id, action) => changeFamilyMember(_id, 'parent', action, 'батька', 'Батька', 'man')}
                                                    disabled={load}
                                                    size={1}
                                                    addButtonText='Додати батька'
                                                    closeText={`Видалити батька із сім'ї?`}
                                                />
                                            </FormItem>
                                            <FormItem
                                                label='Матір'
                                                value={data.parentFamily.mother ? [data.parentFamily.mother] : []}
                                                popover={`Щоб додати парафіянина, необхідно його знайти ввівши ПІБ та натиснути на його картку`}
                                            >
                                                <TagUserList
                                                    onChange={(_id, action) => changeFamilyMember(_id, 'parent', action, 'матері', 'Матір', 'woman')}
                                                    disabled={load}
                                                    size={1}
                                                    addButtonText='Додати матір'
                                                    closeText={`Видалити матір із сім'ї?`}
                                                />
                                            </FormItem>
                                        </div>
                                        <div className='user-falily-siblings'>
                                            <FormItem
                                                label='Брати та сестри'
                                                value={data.parentFamily.children}
                                                popover={`Щоб додати парафіянина, необхідно його знайти ввівши ПІБ та натиснути на його картку`}
                                            >
                                                <TagUserList
                                                    onChange={(_id, action) => changeFamilyMember(_id, 'sibling', action, 'брата чи сестри', 'Брата чи сестру')}
                                                    disabled={load}
                                                    addButtonText='Додати брата чи сестру'
                                                    closeText={`Видалити брата чи сестру із сім'ї?`}
                                                />
                                            </FormItem>
                                        </div>
                                        <div className='user-falily-button'>
                                            <Popconfirm
                                                placement='top'
                                                title={'Ви дійсно хочете видалити парафіянина з батьківської сім\'ї?'}
                                                onConfirm={() => deleteFromFamily(data.parentFamily._id)}
                                                okText='Так'
                                                cancelText='Ні'
                                                disabled={load || !data.parentFamily._id}
                                            >
                                                <Button
                                                    type='default'
                                                    icon={<DeleteOutlined />}
                                                    disabled={load || !data.parentFamily._id}
                                                    danger
                                                >
                                                    Видалити з батьківської сім'ї
                                                </Button>
                                            </Popconfirm>
                                        </div>
                                    </div>
                                </>
                        }
                </>
            }
        </div>
    );
}
