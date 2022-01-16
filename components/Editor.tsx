import "easymde/dist/easymde.min.css";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import SimpleMDE from "react-simplemde-editor";


const Editor = ({value, setValue, createSection, saveSection}: {value: string, setValue: Dispatch<SetStateAction<string>>, createSection: (name: string, body: string) => any, saveSection: (body: string) => any}) => {
    const [lastEvent, setLastEvent] = useState(false)
    const editorRef = useRef();
    const events = {
        // cursorActivity: (instance) => {
        //     const cursorInfo = instance.getCursor();
        //     const thisLine = instance.doc.getLine(cursorInfo.line);
        //     const thisLineToCursor = thisLine.substr(0, cursorInfo.ch);
        //     const thisLineToCursorSplit = thisLineToCursor.split(" ");
        //     const lastPhrase = thisLineToCursorSplit[thisLineToCursorSplit.length - 1];
        //     const isMention = lastPhrase.substr(0, 1) === "@";
        //     console.log(isMention)
        // },
        keydown: (instance, event) => {
            const cursorInfo = instance.getCursor();
            // When enter, the line ur entering from is the cursorInfo.line
            const thisLine = instance.doc.getLine(cursorInfo.line);
            // const prevLine = cursorInfo.line > 0 ? instance.doc.getLine(cursorInfo.line-1) : "";

            const isH1 = thisLine.substr(0, 2) === "# ";

            if (isH1 && event.key === "Enter") {           

                // @ts-ignore
                const codemirror = editorRef.current.simpleMde.codemirror;
                const newBodyArr = instance.doc.children[0].lines.filter((l, idx) => idx > cursorInfo.line).map(l => l.text)
                console.log(newBodyArr)
                const newBody = newBodyArr.join(`
`)
              
                // Delete everything under and including the h1.
                codemirror.doc.replaceRange(
                    "",
                    {line: cursorInfo.line, ch: 0},
                    {line: instance.lineCount(), ch:0}
                );
                const formerSectionValue = codemirror.doc.children[0].lines.map(l => l.text).join(`
`)
                saveSection(formerSectionValue)
                
                const name = thisLine.substr(2, thisLine.length)
                createSection(name, newBody)
            }

        }
    }
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