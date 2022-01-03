import React, { useState } from 'react';
import Container from "../components/Container";
import Input from "../components/Input";

const vp = () => {
    const [newFileName, setNewFileName] = useState<string>("");
    return (
        <Container>
            <Input 
                value={newFileName}
                setValue={setNewFileName}
                type="text"
                placeholder={`New folder`}
                id="new-file"
                className="text-base text-black"
                onKeyDown={e => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        console.log("You just made a folder with the stupid name", newFileName);
                        setNewFileName("")
                    } 
                }}
            />
            {!!newFileName && <p>Enter to save<br/>Esc to exit</p>}
        </Container>
    )
}

export default vp
