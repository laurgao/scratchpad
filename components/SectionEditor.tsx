import axios from "axios";
import "easymde/dist/easymde.min.css";
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { FaAngleDown, FaAngleLeft } from "react-icons/fa";
import Accordion from "react-robust-accordion";
import SimpleMDE from "react-simplemde-editor";
import { waitForEl } from "../utils/key";
import { DatedObj, SectionObj } from "../utils/types";
import { SectionKwargsObj } from "./FileWithSections";
import Input from "./Input";

const AUTOSAVE_INTERVAL = 1000

const SectionEditor = ({section, isOpen, setIter, fileId, sectionsOrder, setOpenSectionId, sectionKwargs, setSectionKwargs, handleError}: {
    section: DatedObj<SectionObj>,
    isOpen: boolean,
    setIter: Dispatch<SetStateAction<number>>,
    fileId: string,
    sectionsOrder: string[],
    setOpenSectionId: Dispatch<SetStateAction<string>>,
    sectionKwargs: SectionKwargsObj,
    setSectionKwargs: Dispatch<SetStateAction<SectionKwargsObj>>,
    handleError: (e: Error) => void,
}) => {
    const editorRef = useRef();
    const [editingTitleValue, setEditingTitleValue] = useState<string>(null);
    
    // H1 new section stuff
    const [lastIsH1, setLastIsH1] = useState<boolean>(false)
    const [h1Line, setH1Line] = useState<number>(null)

    // Stupid memoized fn declaration in 3 parts
    // Need to put these before the useEffect that runs on open
    const createSectionFromH1Ref = useRef<(instance: any, isBlur?: boolean) => (void)>()

    const createSectionFromH1Memoized = useCallback(
        (instance, isBlur?) => {
            const cursorInfo = instance.getCursor()
            const thisLine = instance.doc.getLine(cursorInfo.line)
            const isH1 = !isBlur && thisLine.substr(0, 2) === "# ";
    
            if (isH1) setH1Line(cursorInfo.line)
            if (!isH1 && lastIsH1) {
                // If just clicked off a h1
                const shouldGoToNewSection = !isBlur && cursorInfo.line >= h1Line
                const newCursorPosition = shouldGoToNewSection ? {line: cursorInfo.line - h1Line - 1, ch: cursorInfo.ch} : null
                
                // Get name of new section
                const h1LineContent = instance.doc.getLine(h1Line)
                const name = h1LineContent.substr(2, h1LineContent.length)
    
                // Get body of new section
                const newBodyArr = instance.doc.children[0].lines.filter((l, idx) => idx > h1Line).map(l => l.text)
                const newBody = newBodyArr.join(`
`)
                
                // Delete everything under and including the h1.
                instance.doc.replaceRange(
                    "",
                    {line: h1Line, ch: 0},
                    {line: instance.doc.lineCount(), ch:0}
                );

                // Create the section
                axios.post("/api/section", {
                    file: fileId,
                    name: name || "",
                    body: newBody || "",
                    previousFileId: section._id,
                    shouldBeLastOpenSection: shouldGoToNewSection,
                })
                    .then(res => {
                        if (res.data.error) handleError(res.data.error);
                        else {
                            if (shouldGoToNewSection) {
                                setSectionKwargs({sectionId: res.data.id, condition: "initiate-on-specified-cursor-pos", initialCursorPos: newCursorPosition})
                                setOpenSectionId(res.data.id)
                            }
                            setIter(prevIter => prevIter + 1);  
                        }
                    })
                    .catch(handleError)
    
                // Reset
                setH1Line(null);
                setLastIsH1(false)
                
            } else setLastIsH1(isH1)
        },
        [setLastIsH1, h1Line, lastIsH1, section._id, fileId, handleError, setIter, setOpenSectionId, setSectionKwargs],
      );
    useEffect(() => {
        createSectionFromH1Ref.current = createSectionFromH1Memoized
    }, [createSectionFromH1Memoized])

    useEffect(() => {
        if (isOpen && !editingTitleValue) {
            if (sectionKwargs && sectionKwargs.sectionId === section._id) {
                // Run kwargs when section opens
                if (sectionKwargs.condition === "initiate-with-cursor-on-bottom") {
                    // @ts-ignore
                    const codemirror = editorRef.current.simpleMde.codemirror;
                    codemirror.focus()
                    const lowestLine = codemirror.doc.lineCount() - 1
                    const rightMostChar = codemirror.doc.getLine(lowestLine).length;
                    codemirror.setCursor({line: lowestLine, ch: rightMostChar})

                } else if (sectionKwargs.condition === "initiate-on-specified-cursor-pos") {
                    // @ts-ignore
                    const codemirror = editorRef.current.simpleMde.codemirror;
                    codemirror.focus()
                    codemirror.setCursor(sectionKwargs.initialCursorPos)
                } else if (sectionKwargs.condition === "initiate-on-editing-title") {
                    setEditingTitleValue("# " + (section.name || "")); // In case section.name is undefined for files created before the advent of SectionModel
                    waitForEl(`${section._id}-edit-section-title`);
                }

                setSectionKwargs(null);
                
            } else {
                // When section opens, focus editor unless we're editing title.
                // @ts-ignore
                const codemirror = editorRef.current.simpleMde.codemirror;
                codemirror.focus()
            }
        }
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


    // Stupid memoized function declaration #2: Going to the section below

    const goToSectionBelowRef = useRef<() => (void)>();
    const goToSectionBelowMemoized = useCallback(() => {
        const thisSectionIdx = sectionsOrder.findIndex(id => id.toString() === section._id)
        if (thisSectionIdx < sectionsOrder.length - 1) {
            const belowSectionId = sectionsOrder[thisSectionIdx + 1]
            setSectionKwargs({sectionId: belowSectionId, condition: "initiate-on-editing-title"})
            setOpenSectionId(belowSectionId)
            axios.post("/api/file", {id: fileId, lastOpenSection: belowSectionId})
                .then(res => setIter(prevIter => prevIter + 1))
                .catch(handleError)
            // setShouldGoToSectionBelow(false)
        }
    }, [sectionsOrder, fileId, handleError, section._id, setOpenSectionId, setIter, setSectionKwargs])    

    useEffect(() => {
        goToSectionBelowRef.current = goToSectionBelowMemoized
    }, [goToSectionBelowMemoized])

    // Stupid memoized function declaration #3: Set is editing section name
    const initiateEditingTitleValueRef = useRef<() => (void)>();
    const initiateEditingTitleValueMemoized = useCallback(() => {
        setEditingTitleValue("# " + (section.name || ""))
        waitForEl(`${section._id}-edit-section-title`)
    }, [section.name, section._id])
    useEffect(() => {
        initiateEditingTitleValueRef.current = initiateEditingTitleValueMemoized
    }, [initiateEditingTitleValueMemoized])


    const events = useMemo(() => ({
        cursorActivity: (instance) => {
            createSectionFromH1Ref.current(instance)
        },
        keydown: (instance, event) => {
            // Every keydown that changes cursor (letter key or space, backspace, enter, etc.) is also a cursorActivity. (but not shift, alt, ctrl)
            const cursorInfo = instance.getCursor();

            const willEditTitle = cursorInfo.line === 0 && 
                (event.key === "ArrowUp" || cursorInfo.ch === 0 && event.key === "Backspace" )
            if (willEditTitle) initiateEditingTitleValueRef.current()

            else if (event.key === "ArrowDown" && cursorInfo.line === instance.doc.lineCount() - 1) {
                goToSectionBelowRef.current()
            }
        },
        // blur: (instance) => {
        //     createSectionFromH1Ref.current(instance, true)
        // }
    }), [])

    // For editing section name

    const saveSectionName = () => {
        if (editingTitleValue.substring(0, 2) === "# ") {
            axios.post("/api/section", {id: section._id, name: editingTitleValue.substring(2)})
                .then(res => {
                    setIter(prevIter => prevIter + 1);
                    setEditingTitleValue(null);
                }) 
                .catch(handleError)
        } else {
            deleteSection()
        }
    }

    const deleteSection = () => {
        // Delete section and append its name + body onto the previous section's body.
        const thisSectionIdx = sectionsOrder.findIndex(id => id.toString() === section._id)
        if (thisSectionIdx === 0) {
            // If this is the first section, don't delete it.
            // Will only come here on keydown enter and arrowdown, so save name as empty string.
            axios.post("/api/section", {id: section._id, name: ""})
                .then(res => {
                    setIter(prevIter => prevIter + 1);
                    setEditingTitleValue(null);
                }) 
                .catch(handleError)
            return;
        }
        const prevSectionId = sectionsOrder[thisSectionIdx - 1]

        let addBody = ""
        addBody += `

`
        addBody += editingTitleValue
        addBody += `


`
        addBody += body

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

    return (
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
                                const thisSectionIdx = sectionsOrder.findIndex(id => id.toString() === section._id)
                                if (thisSectionIdx !== 0) {
                                    // Save name and open the section above this section
                                    saveSectionName();
                                    const prevSectionId = sectionsOrder[thisSectionIdx - 1]
                                    setSectionKwargs({sectionId: prevSectionId, condition: "initiate-with-cursor-on-bottom"})
                                    setOpenSectionId(prevSectionId)
                                    axios.post("/api/file", {id: fileId, lastOpenSection: prevSectionId})
                                        .then(res => setIter(prevIter => prevIter + 1))
                                        .catch(handleError)
                                }
                                
                            } else if (e.key === "Backspace" && editingTitleValue.length === 0) {
                                const thisSectionIdx = sectionsOrder.findIndex(id => id.toString() === section._id)
                                if (thisSectionIdx !== 0) deleteSection()
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

                    // Make sure we're not on name editing mode
                    setEditingTitleValue(null);

                    // Update file.lastOpenSection
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
    )
}

export default SectionEditor
