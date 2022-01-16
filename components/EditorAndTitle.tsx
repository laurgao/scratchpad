import axios from "axios";
import { useEffect, useState } from "react";
import { FaAngleDown, FaAngleLeft } from "react-icons/fa";
import Accordion from "react-robust-accordion";
import Editor from "./Editor";

const AUTOSAVE_INTERVAL = 1000

const EditorAndTitle = ({section, isOpen, createSection, handleError, handleSectionOnClickAccordion, setIter, fileId}) => {
    const [isSaved, setIsSaved] = useState<boolean>(true);
    const [body, setBody] = useState<string>(section.body);
    
    useEffect(() => {
        const x = document.getElementsByClassName("autosave")
        if (x && x.length > 0) x[x.length - 1].innerHTML = isSaved ? "Saved" : "Saving..."
    }, [isSaved])

    useEffect(() => {
        const interval = setInterval(() => {
            if (!isSaved) saveSection(section._id, body)
            
        }, AUTOSAVE_INTERVAL);

        return () => clearInterval(interval); // This represents the unmount function, in which you need to clear your interval to prevent memory leaks.
    }, [body, isSaved])
    

    useEffect(() => { if (body !== section.body) setIsSaved(false); }, [body])  
    
    function saveSection(id, value) {
        console.log("saving...")

        axios.post("/api/section", {
            id: id,
            body: value,
        }).then(res => {
            if (res.data.error) handleError(res.data.error);
            else {
                console.log(res.data.message);
                setIsSaved(true);
                setIter(previter => previter + 1);
            }
        }).catch(handleError);
    }
    
    return (
        <>
        <Accordion
            label={
                <div className="flex p-2 items-center" style={{height: "30px"}}>
                    <p>{section.name}</p>
                    {isOpen ? <FaAngleDown size={14} className="ml-auto"/> : <FaAngleLeft size={14} className="ml-auto"/>}
                </div>
            }                            
            setOpenState={(event) => {
                handleSectionOnClickAccordion(event, section, isOpen)
                axios.post("/api/file", {
                    id: fileId, 
                    lastOpenSection: isOpen ? "null" : section._id
                }).then(res => {
                    console.log(res.data.message)
                    setIter(prevIter => prevIter + 1)
                }).catch(handleError)
            }}
            openState={isOpen}
        >
            <Editor value={body} setValue={setBody} createSection={createSection} saveSection={(body: string) => saveSection(section._id, body)}/>
        </Accordion>                        
        <hr/>
        </>
    )
}

export default EditorAndTitle
