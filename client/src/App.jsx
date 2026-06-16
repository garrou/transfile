import { useState } from "react";
import { Upload, Download, Trash } from "lucide-react";
import SendPanel from "./components/SendPanel";
import ReceiveFile from "./components/ReceiveFile";
import DeleteFile from "./components/DeleteFile";
import Info from "./components/Info";

const App = () => {
    const [mode, setMode] = useState("send");

    return (
        <div className="app-container">
            <div className="max-width">
                <div className="header">
                    <h1 className="title">Transfile</h1>
                    <p className="subtitle">
                        Military-grade encryption for sharing files and messages safely. One passphrase is all you need.
                    </p>
                </div>

                <div className="mode-selector">
                    <button
                        onClick={() => setMode("send")}
                        className={`mode-btn ${mode === "send" ? "active" : ""}`}
                    >
                        <Upload size={20} />
                        Send
                    </button>
                    <button
                        onClick={() => setMode("receive")}
                        className={`mode-btn ${mode === "receive" ? "active" : ""}`}
                    >
                        <Download size={20} />
                        Receive
                    </button>
                    <button
                        onClick={() => setMode("delete")}
                        className={`mode-btn ${mode === "delete" ? "active" : ""}`}
                    >
                        <Trash size={20} />
                        Delete
                    </button>
                </div>

                {mode === "send" ? <SendPanel /> : mode === "receive" ? <ReceiveFile /> : <DeleteFile />}

                <Info />
            </div>
        </div>
    );
};

export default App;