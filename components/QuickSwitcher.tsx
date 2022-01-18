import axios from "axios";
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FiSearch } from "react-icons/fi";
import useSWR from "swr";
import fetcher from "../utils/fetcher";
import { waitForEl } from "../utils/key";
import { DatedObj, FileObj, SectionObj } from "../utils/types";
import Button from "./Button";
import H3 from "./H3";
import Modal from "./Modal";

const QuickSwitcher = (props: {isOpen: boolean, onRequestClose: () => (any), setOpenFileId: Dispatch<SetStateAction<string>>}) => {
    const newProps = {...props}
    delete newProps.setOpenFileId
    
    const [query, setQuery] = useState<string>("");
    const {data, error} = useSWR<{data: DatedObj<SectionObj & {fileArr: FileObj[]}>[], error: any}>(`/api/search?query=${query}`, query.length ? fetcher : async () => []);
    console.log(data)

    useEffect(() => {
        if (props.isOpen) waitForEl("quick-switcher");
    }, [props.isOpen])

    return (
        <Modal {...props} className="px-4 py-6">
            <div className="flex items-center border-gray-100" id="f">
                <FiSearch className="text-gray-400 mr-6"/>
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    id="quick-switcher"
                    placeholder="Quick file switcher"
                    className="w-full focus:online-none outline-none py-1 text-gray-500"
                />
            </div>
            <hr/>
            <div className="mt-4 break-words overflow-hidden flex flex-col">
                {(data && data.data) ? (
                    data.data.map(s => 
                        <Button key={s._id} className="px-8 hover:bg-gray-100 text-left" onClick={() => {
                            axios.post("/api/file", {id: s.file, lastOpenSection: s._id})
                                .then(res => {
                                    props.setOpenFileId(s.file);
                                    props.onRequestClose()
                                    setQuery("")
                                })
                                .catch(console.log)
                            
                        }}>
                            <div className="w-full">
                                <H3>{`${s.fileArr[0] ? s.fileArr[0].name : "Unknown file"} / ${s.name || "Untitled section"}`}</H3>
                                <SearchBody section={s} query={query}/>
                            </div>
                        </Button>
                    )
                ) : (
                    <p className="text-gray-700 px-8">No documents with the given query were found.</p>
                )}
            </div>
        </Modal>
    )
}

const includesAQueryWord = (string: string, queryWords: string[]) => {
    for (let word of queryWords) {
        if (string.toLowerCase().includes(word.toLowerCase())) return true
    }
    return false
}

const SearchBody = ({section, query}) => {
    // s.body.substr(s.body.indexOf(query) - 50, 100)
    const queryWords = query.split(" ")
    const paragraphsArr = section.body.split(`
`)
    const newParagraphs = paragraphsArr.filter(p => (
        includesAQueryWord(p, queryWords)
    )).map(p => {
        // Some really jank shit for bolding certain words
        const paragraphWords = p.split(" ")
        const newParagraphWords = paragraphWords.map(w => includesAQueryWord(w, queryWords) ? <b className="text-gray-500">{w}</b> : <span>{w}</span>)
        // return newParagraphWords.join(" ")
        return newParagraphWords
    })
    return (
        // newParagraphs.map( (p, idx) => <pre className="whitespace-pre-wrap text-gray-400 text-sm" key={idx}>
        //     {p}
        // </pre>)
        <div className="text-gray-400 text-sm">
            {newParagraphs.map( (p, idx) => <p key={idx}>{p.map((f, id) => <span key={id}>{f} </span>)}</p>)}
        </div>
    )
}
 

export default QuickSwitcher
