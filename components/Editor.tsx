import axios from "axios";
import { FaAngleDown, FaAngleLeft } from "react-icons/fa";
import Accordion from "react-robust-accordion";
import "easymde/dist/easymde.min.css";
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import SimpleMDE from "react-simplemde-editor";
import Input from "./Input";
import { waitForEl } from "../utils/key";
import { DatedObj, SectionObj } from "../utils/types";

const AUTOSAVE_INTERVAL = 1000

const Editor = ({section, isOpen, createSection, handleError, handleSectionOnClickAccordion, setIter, fileId}: {
    section: DatedObj<SectionObj>,
    isOpen: boolean,
    createSection: (name: string, body: string) => any,
    handleError: (e) => any,
    handleSectionOnClickAccordion: (event, section: DatedObj<SectionObj>, isOpen: boolean) => any,
    setIter: Dispatch<SetStateAction<number>>,
    fileId: string,
}) => {
    const editorRef = useRef();
    useEffect(() => {
        // @ts-ignore
        if (isOpen && !editingTitleValue) editorRef.current.simpleMde.codemirror.focus()
    }, [isOpen])

    // Autosave stuff
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

    // H1 new section stuff
    const [lastEvent, setLastEvent] = useState(false)
    const [lastEvents, setLastEvents] = useState([])
    const [h1Line, setH1Line] = useState(null)
    const [editingTitleValue, setEditingTitleValue] = useState(null);
    const [initiateEditingTitleValue, setInitiateEditingTitleValue] = useState(false)
    
    const events = useMemo(() => ({
        cursorActivity: (instance) => {
            const cursorInfo = instance.getCursor()
            const thisLine = instance.doc.getLine(cursorInfo.line)
            const isH1 = thisLine.substr(0, 2) === "# ";

            setLastEvent(isH1)
            if (isH1) setH1Line(cursorInfo.line)
        },
        keydown: (instance, event) => {
            const cursorInfo = instance.getCursor();
            const thisLine = instance.doc.getLine(cursorInfo.line);

            const isH1 = thisLine.substr(0, 2) === "# ";
            setLastEvent(isH1)
            if (isH1) setH1Line(cursorInfo.line)

            if (cursorInfo.line === 0 && event.key === "ArrowUp") setInitiateEditingTitleValue(true)
        }
    }), [])

    useEffect(() => {
        // Because if section.name changes calling this function in the useMemo will not take the new section.name into account
        // even if it's in the dep array
        if (initiateEditingTitleValue) {
            setEditingTitleValue("# " + section.name)
            waitForEl(`${section._id}-edit-section-title`)
            setInitiateEditingTitleValue(false)
        }
    }, [initiateEditingTitleValue, section.name, section._id])

    useEffect(() => {
        if (!lastEvent && lastEvents[lastEvents.length - 1]) {
            // If just clicked off a h1

            // @ts-ignore
            const codemirror = editorRef.current.simpleMde.codemirror;

            // Get name of new section
            const thisLine = codemirror.doc.getLine(h1Line)
            const name = thisLine.substr(2, thisLine.length)

            // Get body of new section
            const newBodyArr = codemirror.doc.children[0].lines.filter((l, idx) => idx > h1Line).map(l => l.text)
            const newBody = newBodyArr.join(`
`)
            
            // Delete everything under and including the h1.
            codemirror.doc.replaceRange(
                "",
                {line: h1Line, ch: 0},
                {line: codemirror.doc.lineCount(), ch:0}
            );
            const formerSectionValue = codemirror.doc.children[0].lines.map(l => l.text).join(`
`)
            saveSection(section._id, formerSectionValue)
            
            createSection(name, newBody)

            setH1Line(null);
            setLastEvent(false); // should alr b false doe
            setLastEvents([])
        } else {
            setLastEvents(p => [...p, lastEvent])
        }

    }, [lastEvent])
    // createSection and saveSection should never change bc they're static functions
    // h1line only changes in 1 place and that's also where lastEvent changes.
    // lastEvents doesn't change except for inside this useEffect. if i include it in the dependency array, it might cause infinite calling?
    
    return (
        <>
        <div className="relative">
            {(editingTitleValue || typeof(editingTitleValue) === "string") && (
                <div className="absolute left-2">
                    <Input
                        value={editingTitleValue}
                        setValue={setEditingTitleValue}
                        id={`${section._id}-edit-section-title`}
                        placeholder="# Section name"
                        type="text"
                        onKeyDown={e => {
                            if (e.key === "Escape") {
                                setEditingTitleValue(null)
                                // @ts-ignore
                                editorRef.current.simpleMde.codemirror.focus()
                            }
                            else if (e.key === "ArrowDown" || e.key === "Enter") {
                                e.preventDefault()
                                if (editingTitleValue.substr(0, 2) === "# ") {
                                    axios.post("/api/section", {id: section._id, name: editingTitleValue.substr(2, editingTitleValue.length - 1)})
                                    .then(res => setIter(prevIter => prevIter + 1)) 
                                    .catch(handleError)
                                    .finally(() => setEditingTitleValue(null))
                                } else {
                                    // Delete section and append its body onto the previous section's body.
                                }
                                // @ts-ignore
                                editorRef.current.simpleMde.codemirror.focus()
                            } else if (e.key === "ArrowUp") {
                                // Open the section above this section
                            }
                        }}
                    />
                </div>
            )}
        <Accordion
            label={
                <div className="flex p-2 items-center" style={{height: "30px"}}>
                    {!(editingTitleValue || typeof(editingTitleValue) === "string") && ( <p>{section.name}</p> )}
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
            {/* <Editor value={body} setValue={setBody} createSection={createSection} saveSection={(body: string) => saveSection(section._id, body)}/> */}
            <SimpleMDE
                ref={editorRef}
                onChange={setBody}
                value={body}
                options={{
                    spellChecker: false,
                    placeholder: "Unload your working memory ✨ ...",
                    toolbar: []
                }}
                className="text-lg"
                events={events}
            />
            </Accordion>                        
        <hr/>
        </div>
        </>
    )
}

export default Editor
