import axios from "axios";
import "easymde/dist/easymde.min.css";
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { FaAngleDown, FaAngleLeft } from "react-icons/fa";
import Accordion from "react-robust-accordion";
import SimpleMDE from "react-simplemde-editor";
import { waitForEl } from "../utils/key";
import { DatedObj, SectionObj } from "../utils/types";
import Input from "./Input";

const AUTOSAVE_INTERVAL = 1000

const Editor = ({section, isOpen, createSection, setIter, fileId, sectionsOrder, setOpenSectionId, handleError}: {
    section: DatedObj<SectionObj>,
    isOpen: boolean,
    handleError: (e) => any,
    setIter: Dispatch<SetStateAction<number>>,
    fileId: string,
    sectionsOrder: string[],
    setOpenSectionId: Dispatch<SetStateAction<string>>,
    createSection: (name: string, body: string, previousFileId?: string) => any,
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
        // If section.body gets modified by another section, like when the section below it is deleted
        if (isSaved && body !== section.body) { 
            setBody(section.body)
            setIsSaved(true)
        }
    }, [section.body])
    
    useEffect(() => {
        const x = document.getElementsByClassName("autosave")
        if (x && x.length > 0) x[x.length - 1].innerHTML = isSaved ? "Saved" : "Saving..."
    }, [isSaved])

    // MAIN AUTOSAVE INTERVAL
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isSaved) saveSection(section._id, body)
            
        }, AUTOSAVE_INTERVAL);

        // This represents the unmount function, in which you need to clear your interval to prevent memory leaks.
        return () => {
            clearInterval(interval); 
            // if (!isSaved) saveSection(section._id, body)
        }
    }, [body, isSaved])

    useEffect(() => {
        // Save section when component is unmounted
        return () => {
            if (!isSaved) saveSection(section._id, body)
        }
    }, [])
    

    useEffect(() => { if (body !== section.body) setIsSaved(false); }, [body])  
    
    function saveSection(id, value) {
        console.log("saving...")

        axios.post("/api/section", { id: id, body: value, })
            .then(res => {
                if (res.data.error) handleError(res.data.error);
                else {
                    console.log(res.data.message);
                    setIsSaved(true);
                    setIter(previter => previter + 1);
                }
            })
            .catch(handleError);
    }

    // H1 new section stuff
    const [lastIsH1, setLastIsH1] = useState<boolean>(false)
    const [lastIsH1s, setLastIsH1s] = useState<boolean[]>([])
    const [h1Line, setH1Line] = useState<number>(null)
    const [editingTitleValue, setEditingTitleValue] = useState<string>(null);
    const [initiateEditingTitleValue, setInitiateEditingTitleValue] = useState<boolean>(false)
    const [shouldGoToSectionBelow, setShouldGoToSectionBelow] = useState<boolean>(false);
    
    const events = useMemo(() => ({
        cursorActivity: (instance) => {
            const cursorInfo = instance.getCursor()
            const thisLine = instance.doc.getLine(cursorInfo.line)
            const isH1 = thisLine.substr(0, 2) === "# ";

            setLastIsH1(isH1)
            if (isH1) setH1Line(cursorInfo.line)
        },
        keydown: (instance, event) => {
            const cursorInfo = instance.getCursor();
            const thisLine = instance.doc.getLine(cursorInfo.line);

            const isH1 = thisLine.substr(0, 2) === "# ";
            setLastIsH1(isH1)
            if (isH1) setH1Line(cursorInfo.line)

            const willEditTitle = cursorInfo.line === 0 && 
                (event.key === "ArrowUp" || cursorInfo.ch === 0 && event.key === "Backspace" )
            if (willEditTitle) setInitiateEditingTitleValue(true)

            else if (event.key === "ArrowDown" && cursorInfo.line === instance.doc.lineCount() - 1) {
                setShouldGoToSectionBelow(true)
            }
        },
        blur: (instance) => {
            setLastIsH1(false)
        }
    }), [])

    // SET IS EDITING SECTION NAME
    useEffect(() => {
        // Because if section.name changes calling this function in the useMemo will not take the new section.name into account
        // even if it's in the dep array
        if (initiateEditingTitleValue) {
            setEditingTitleValue("# " + section.name)
            waitForEl(`${section._id}-edit-section-title`)
            setInitiateEditingTitleValue(false)
        }
    }, [initiateEditingTitleValue, section.name, section._id])

    // CREATE NEW SECTION FROM H1
    useEffect(() => {
        if (!lastIsH1 && lastIsH1s[lastIsH1s.length - 1]) {
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
//             const formerSectionValue = codemirror.doc.children[0].lines.map(l => l.text).join(`
// `)
//             saveSection(section._id, formerSectionValue)
            
            createSection(name, newBody, section._id)

            setH1Line(null);
            setLastIsH1(false); // should alr b false doe
            setLastIsH1s([])
        } else {
            setLastIsH1s(p => [...p, lastIsH1])
        }

    }, [lastIsH1])
    // createSection and saveSection should never change bc they're static functions
    // h1line only changes in 1 place and that's also where lastEvent changes.
    // lastEvents doesn't change except for inside this useEffect. if i include it in the dependency array, it might cause infinite calling?
    
    
    const saveSectionName = () => {
        if (editingTitleValue.substring(0, 2) === "# ") {
            axios.post("/api/section", {id: section._id, name: editingTitleValue.substring(2)})
            .then(res => {
                setIter(prevIter => prevIter + 1);
                setEditingTitleValue(null);
            }) 
            .catch(handleError)
        } else {
            // Delete section and append its body onto the previous section's body.
            const thisSectionIdx = sectionsOrder.findIndex(id => id.toString() === section._id)
            const prevSectionId = sectionsOrder[thisSectionIdx - 1]

            let addBody = ""
            addBody += `

`
            addBody += editingTitleValue
            addBody += `

`
            addBody += body

            // const promise1 = axios.post("/api/section", {id: prevSectionId, addBody: addBody})
            // const promise2 = axios.delete("/api/section", {data: {id: section._id}})

            // Promise.all([promise1, promise2])
            //     .then(res => {
            //         console.log(res[0].data.message, res[1].data.message)
            //     })
            //     .catch(console.log) // returned error is array of errors
            //     .finally(() => {
            //         setOpenSectionId(prevSectionId);
            //         setEditingTitleValue(null);
            //         setIter(prevIter => prevIter + 1);
            //     })

            // This is rlly jank
            axios.post("/api/section", {id: prevSectionId, addBody: addBody})
                .then(res => {
                    // Setting opensectionid not needed bc it gets updated in FileWithSections' useEffect
                    // but ima keep it anyway bc idk insecure
                    setOpenSectionId(prevSectionId);
                    setEditingTitleValue(null);
                })
                .catch(handleError)
            axios.delete("/api/section", {data: {id: section._id}})
                .then(res => {
                    // setOpenSectionId(prevSectionId);
                    // setIter(prevIter => prevIter + 1);
                    // setEditingTitleValue(null);
                })
                .catch(handleError)

            // Update file.lastOpenSection
            axios.post("/api/file", { id: fileId, lastOpenSection: prevSectionId })
            .then(res => {
                console.log(res.data.message)
                setIter(prevIter => prevIter + 1)
            })
            .catch(handleError)
        }
    }

    // Go to section below
    useEffect(() => {
        if (shouldGoToSectionBelow) {
            const thisSectionIdx = sectionsOrder.findIndex(id => id.toString() === section._id)
            const belowSectionId = sectionsOrder[thisSectionIdx + 1]
            setOpenSectionId(belowSectionId)
            axios.post("/api/file", {id: fileId, lastOpenSection: belowSectionId})
                .then(res => setIter(prevIter => prevIter + 1))
                .catch(handleError)
            setShouldGoToSectionBelow(false)
        }
    }, [shouldGoToSectionBelow, sectionsOrder])

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
                        onBlur={() => saveSectionName()}
                        onKeyDown={e => {
                            if (e.key === "Escape") {
                                setEditingTitleValue(null)
                                // @ts-ignore
                                editorRef.current.simpleMde.codemirror.focus()
                            }
                            else if (e.key === "ArrowDown" || e.key === "Enter") {
                                e.preventDefault()
                                saveSectionName()
                                // @ts-ignore
                                editorRef.current.simpleMde.codemirror.focus()
                            } else if (e.key === "ArrowUp") {
                                // Save name and open the section above this section
                                saveSectionName();
                                const thisSectionIdx = sectionsOrder.findIndex(id => id.toString() === section._id)
                                const prevSectionId = sectionsOrder[thisSectionIdx - 1]
                                setOpenSectionId(prevSectionId)
                                axios.post("/api/file", {id: fileId, lastOpenSection: prevSectionId})
                                    .then(res => setIter(prevIter => prevIter + 1))
                                    .catch(handleError)
                                
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
                // Handle only allowing 1 section to be open at a time
                if (isOpen) setOpenSectionId(null);
                else setOpenSectionId(section._id);

                // Update fle.lastOpenSection
                axios.post("/api/file", { id: fileId, lastOpenSection: isOpen ? "null" : section._id })
                    .then(res => {
                        console.log(res.data.message)
                        setIter(prevIter => prevIter + 1)
                    })
                    .catch(handleError)
            }}
            openState={isOpen}
        >
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
