import { useState, useEffect, useRef } from 'react';
import { Input, Tag, Popconfirm } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';

export default function TagList (props) {
    const { value: tags, disabled, onChange, size, addButtonText, renderTag } = props;
    
    const [inputValue, setInputValue] = useState('');
    const [inputVisible, setInputVisible] = useState(false);

    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [inputVisible])

    function handleInputChange (event) {
        setInputValue(event.target.value);
    }

    function showInput () {
        if(!disabled) {
            setInputVisible(true);
        }
    }

    function hideInput () {
        setInputValue('');
        setInputVisible(false);
    }

    function handleInputConfirm () {
        onChange([...new Set([...tags, inputValue])]);
        setInputValue('');
        setInputVisible(false);
    }

    function handleClose (removedTag) {
        const newTags = tags.filter(tag => tag !== removedTag);
        onChange(newTags);
    }

    return (
        <div>
            {
                tags.map(tag => 
                    <Tag
                        color='blue'
                        className='edit-tag'
                        key={tag}
                        closable={true}
                        closeIcon={(
                            <Popconfirm
                                placement='top'
                                title={'Видалити телефон?'}
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
                            {renderTag ? renderTag(tag) : tag}
                        </span>
                    </Tag>)
            }
            {
                inputVisible && (
                    <Input
                        ref={inputRef}
                        type='text'
                        size='small'
                        className='tag-input'
                        value={inputValue}
                        onChange={handleInputChange}
                        onPressEnter={handleInputConfirm}
                        onBlur={hideInput}
                    />
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