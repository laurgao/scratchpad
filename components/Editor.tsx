import "easymde/dist/easymde.min.css";
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import SimpleMDE from "react-simplemde-editor";


const Editor = ({value, setValue, createSection, saveSection}: {value: string, setValue: Dispatch<SetStateAction<string>>, createSection: (name: string, body: string) => any, saveSection: (body: string) => any}) => {
    const [lastEvent, setLastEvent] = useState(false)
    // const [secondLastEvent, setSecondLastEvent] = useState(false)
    const [lastEvents, setLastEvents] = useState([])
    const [h1Line, setH1Line] = useState(null)
    const editorRef = useRef();

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
            saveSection(formerSectionValue)
            
            createSection(name, newBody)

            setH1Line(null);
            setLastEvent(false); // should alr b false doe
            setLastEvents([])
        } else {
            setLastEvents(p => [...p, lastEvent])
        }

    }, [lastEvent])
    // createSection should never change bc it's a static function
    // h1line only changes in 1 place and that's also where lastEvent changes.
    // lastEvents doesn't change except for inside this useEffect. if i include it in the dependency array, it might cause infinite calling?
    // saveSection might change bc it changes with openSectionId. but w each new opensectionid a new Editor is instantiated and it shouldn't retain its internal state.

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
            // When enter, the line ur entering from is the cursorInfo.line
            const thisLine = instance.doc.getLine(cursorInfo.line);
            // const prevLine = cursorInfo.line > 0 ? instance.doc.getLine(cursorInfo.line-1) : "";

            const isH1 = thisLine.substr(0, 2) === "# ";
            setLastEvent(isH1)
            if (isH1) setH1Line(cursorInfo.line)
//             if (isH1 && event.key === "Enter") setLastEvent(false)
//             else 

//             if (isH1 && event.key === "Enter") {           

//                 // @ts-ignore
//                 const codemirror = editorRef.current.simpleMde.codemirror;
//                 const newBodyArr = instance.doc.children[0].lines.filter((l, idx) => idx > cursorInfo.line).map(l => l.text)
//                 const newBody = newBodyArr.join(`
// `)
              
//                 // Delete everything under and including the h1.
//                 codemirror.doc.replaceRange(
//                     "",
//                     {line: cursorInfo.line, ch: 0},
//                     {line: instance.lineCount(), ch:0}
//                 );
//                 const formerSectionValue = codemirror.doc.children[0].lines.map(l => l.text).join(`
// `)
//                 saveSection(formerSectionValue)
                
//                 const name = thisLine.substr(2, thisLine.length)
//                 createSection(name, newBody)
//             }

        }
    }), [])
    return (
        <SimpleMDE
            ref={editorRef}
            onChange={setValue}
            value={value}
            options={{
                spellChecker: false,
                placeholder: "Unload your working memory ✨ ...",
                toolbar: []
            }}
            className="text-lg"
            events={events}
        />
    )
}

export default Editor