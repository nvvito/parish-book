import { Result } from 'antd';

export default function NotFound () {
    return (
        <div className='page-content'>
            <Result
                status='404'
                title='Сторінки не знайдено...'
            />
        </div>
    );
}
