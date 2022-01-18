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
    const [page, setPage] = useState<number>(0);
    const {data} = useSWR<{data: DatedObj<SectionObj & {fileArr: FileObj[]}>[], count: number}>(`/api/search?query=${query}&page=${page}`, query.length ? fetcher : async () => []);

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
            <div className="mt-4">
                {(data && data.data && data.data.length) ? (
                    <div className="break-words overflow-hidden flex flex-col">
                        { /* Every outermost element inside this div has px-8 */ }
                        {data.data.map(s => 
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
                        )}
                        {/* Pagination bar */}
                        <div className="px-8 flex gap-4 text-sm text-gray-400 mt-6">
                            {Array.from(Array(Math.ceil(18/10)).keys()).map(n => 
                                <Button onClick={() => setPage(n)} className="hover:bg-gray-50 rounded-md px-4" key={n}>{n + 1}</Button>
                            )}
                        </div>
                        <p className="px-8 text-sm text-gray-400 mt-2 md:text-right">Showing results {page * 10 + 1}-{(page *10 + 10) < data.count ? (page *10 + 10) : data.count} out of {data.count}</p>
                    </div>
                ) : (
                    <p className="text-gray-400 px-8 text-sm mt-6">No documents with the given query were found.</p>
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
            {newParagraphs.map( (p, idx) => <p key={idx} className="mb-2">{
                p.map((f, id) => <span key={id}>{f} </span>)
            }</p>)}
        </div>
    )
}
 

export default QuickSwitcher
