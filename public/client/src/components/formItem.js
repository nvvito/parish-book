import { useState, useEffect } from 'react';
import { Popover } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

export default function FormItem (props) {
    const [showAlert, setShowAletr] = useState(false);
    
    const { label, required = false, value, popover } = props;

    useEffect(() => {
        if (required && !value) setShowAletr(true);
        else setShowAletr(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    function renderChild () {
        const child = props.children;
        const newProps = { ...child.props };

        newProps.value = value;

        const oldClasses = newProps.className || '';
        const newClasses = (required && showAlert)
            ? ' element-alert'
            : '';

        newProps.className = oldClasses + newClasses;

        return { ...child, props: newProps }
    }

    return (
        <div className={`form-element ${required ? 'element-required' : ''}`}>
            <span>
                {`${label} `}
                {
                    popover && (
                        <Popover
                            content={popover}
                        >
                            <InfoCircleOutlined />
                        </Popover>
                    )
                }
            </span>
            {
                renderChild()
            }
            {
                required && showAlert
                    ? <span>
                        Поле є обовязковим для заповнення!
                    </span>
                    : ''
            }
        </div>
    )
}