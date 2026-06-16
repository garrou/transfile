import { useState } from 'react';
import { File, MessageSquareText } from 'lucide-react';
import SendFile from './SendFile';
import SendText from './SendText';
import { TYPE_FILE, TYPE_TEXT } from '../utils/constants';

const SendPanel = () => {
    const [sendType, setSendType] = useState(TYPE_FILE);

    return (
        <div>
            <div className="send-type-selector">
                <button
                    onClick={() => setSendType(TYPE_FILE)}
                    className={`send-type-btn ${sendType === TYPE_FILE ? 'active' : ''}`}
                >
                    <File size={16} />
                    File
                </button>
                <button
                    onClick={() => setSendType(TYPE_TEXT)}
                    className={`send-type-btn ${sendType === TYPE_TEXT ? 'active' : ''}`}
                >
                    <MessageSquareText size={16} />
                    Text
                </button>
            </div>

            {sendType === TYPE_FILE ? <SendFile /> : <SendText />}
        </div>
    );
};

export default SendPanel;
