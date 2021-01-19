import axios from 'axios';
import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../services/auth';

export default function LoginPage () {
    const [load, setLoad] = useState(false);

    const history = useHistory();
    const location = useLocation();
    const { login, token } = useAuth();

    const { from } = location.state || { from: { pathname: '/' } };

    const onFinish = async values => {
        setLoad(true);
        try {
            const { data } = await axios.post('/api/admin/login', values);
            login(data.message, 'andLocal');
            setLoad(false);
        } catch (err) {
            setLoad(false);
            message.error(`Помилка авторизації! Перевірте ім'я адміністратора чи пароль та спробуйте знову`)
        }
    };

    useEffect(() => {
        if (token) {
            history.replace(from);
        }
    });

    return (
        <Card className='form-card'>
            <Form
                layout='vertical'
                className='login-form'
                onFinish={onFinish}
            >
                <Form.Item
                    label='Логін'
                    name='username'
                    rules={[{ required: true, message: `Ім'я логін є обовязковим!` }]}
                >
                    <Input
                        disabled={load}
                        prefix={<UserOutlined className='site-form-item-icon' style={{ color: 'rgba(0,0,0,.25)' }} />}
                        placeholder={`Введіть логін...`}
                    />
                </Form.Item>
                <Form.Item
                    label='Пароль'
                    name='password'
                    rules={[{ required: true, message: 'Пароль є обовязковим!' }]}
                >
                    <Input
                        disabled={load}
                        prefix={<LockOutlined className='site-form-item-icon' style={{ color: 'rgba(0,0,0,.25)' }} />}
                        type='password'
                        placeholder={`Введіть пароль...`}
                    />
                </Form.Item>
                <Form.Item>
                    <Button
                        type='primary'
                        htmlType='submit'
                        className='login-form-button'
                        loading={load}
                    >
                        Вхід
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
}
