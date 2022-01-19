import axios from "axios";
import { Dispatch, SetStateAction, useState } from 'react';
import { FiSearch } from "react-icons/fi";
import Skeleton from "react-loading-skeleton";
import useSWR from "swr";
import fetcher from "../utils/fetcher";
import { waitForEl } from "../utils/key";
import { DatedObj, FileObj, SectionObj } from "../utils/types";
import Button from "./Button";
import H3 from "./H3";
import Modal from "./Modal";

type SectionOrFile = (SectionObj & {fileItem: FileObj}) | FileObj

const QuickSwitcher = (props: {isOpen: boolean, onRequestClose: () => (any), setOpenFileId: Dispatch<SetStateAction<string>>}) => {
    const [query, setQuery] = useState<string>("");
    const [page, setPage] = useState<number>(0);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const {data} = useSWR<{data: DatedObj<SectionOrFile>[], count: number}>(`/api/search?query=${query}&page=${page}`, query.length ? fetcher : async () => []);

    const onRequestClose = () => {
        props.onRequestClose();
        setQuery("");
        setPage(0)
    }

    return (
        <Modal 
            isOpen={props.isOpen} 
            onRequestClose={onRequestClose} 
            className="px-4 py-6"
            id="quick-switcher-modal"
        >
            <div className="flex items-center border-gray-100" id="f">
                <FiSearch className="text-gray-400 mr-6"/>
                <input
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        setPage(0);
                        setSelectedIndex(0);
                    }}
                    id="quick-switcher-input"
                    placeholder="Go to document"
                    className="w-full focus:online-none outline-none py-1 text-gray-500"
                    autoFocus
                    onKeyDown={e => {
                        if (data && data.data && data.data.length) {
                            if (e.key === "ArrowDown") {
                                e.preventDefault()
                                const newSelectedIndex = selectedIndex === (data.data.length - 1) ? 0 : selectedIndex + 1
                                setSelectedIndex(newSelectedIndex)

                                // Scroll to selected element
                                const modal = document.getElementById("quick-switcher-modal")
                                    if (newSelectedIndex !== (data.data.length - 1)) {
                                        // Scroll such that the bottom of the element we want is at the bottom of the modal viewing area
                                        var elmntAfter = document.getElementById(`searched-doc-${newSelectedIndex + 1}`);
                                        modal.scroll(0, elmntAfter.offsetTop - modal.offsetHeight)
                                    } else {
                                        // Is last element
                                        var elmnt = document.getElementById(`searched-doc-${newSelectedIndex}`);
                                        modal.scroll(0, elmnt.offsetTop)
                                    }
                            } else if (e.key === "ArrowUp") {
                                e.preventDefault()
                                const newSelectedIndex = selectedIndex === 0 ? (data.data.length - 1) : (selectedIndex - 1)
                                setSelectedIndex(newSelectedIndex)

                                // Scroll to selected element
                                var elmnt = document.getElementById(`searched-doc-${newSelectedIndex}`);
                                const modal = document.getElementById("quick-switcher-modal")
                                modal.scroll(0, elmnt.offsetTop)
                            } else if (e.key === "Enter") {
                                waitForEl(`searched-doc-${selectedIndex}`)
                            }
                        }
                    }}
                />
            </div>
            <hr/>
            <div className="mt-4">
                { /* Every outermost element inside this div has px-8 */ }
                {(data) ? (data.data && data.data.length) ? (
                    <div className="break-words overflow-hidden flex flex-col">
                        {data.data.map((s, idx) => {
                            // @ts-ignore 
                            const isSection = !!s.file

                            let onClick = () => {};
                            let buttonChildren = <></>
                            if (isSection) {
                                onClick = () => {
                                    // @ts-ignore
                                    axios.post("/api/file", {id: s.file, lastOpenSection: s._id})
                                        .then(res => {
                                            // @ts-ignore
                                            props.setOpenFileId(s.file);
                                            onRequestClose()
                                        })
                                        .catch(console.log)
                                }
                                buttonChildren = (
                                    <>
                                    {/* @ts-ignore */}
                                    <H3>{`${s.fileItem ? s.fileItem.name : "Unknown file"}${s.name ? (" / " + s.name) : ""}`}</H3>
                                    <SearchBody section={s} query={query}/>
                                    </>
                                )
                            } else {
                                onClick = () => {
                                    props.setOpenFileId(s._id)
                                    onRequestClose()
                                }
                                buttonChildren =  <H3>{`${s.name}`}</H3>
                            }
                            
                            return (
                                <Button 
                                    key={s._id} 
                                    className={("px-8 text-left") + (idx === selectedIndex ? " bg-gray-100" : "")} 
                                    id={`searched-doc-${idx}`} 
                                    onClick={onClick} 
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                >
                                    <div className="w-full">
                                        {buttonChildren}
                                    </div>
                                </Button>
                            )
                        })}
                        {/* Pagination bar */}
                        <div className="px-8 flex gap-4 text-sm text-gray-400 mt-6">
                            {data.count > 10 && Array.from(Array(Math.ceil(data.count/10)).keys()).map(n => 
                                <Button onClick={() => {
                                    setPage(n);
                                    setSelectedIndex(0);
                                    waitForEl("quick-switcher-input")
                                }} className="hover:bg-gray-50 disabled:bg-gray-50 rounded-md px-4" key={n} disabled={n === page}>{n + 1}</Button>
                            )}
                        </div>
                        <p className="px-8 text-sm text-gray-400 mt-2 md:text-right">
                            Showing results {page * 10 + 1}-{(page *10 + 10) < data.count ? (page *10 + 10) : data.count} out of {data.count}
                        </p>
                    </div>
                ) : (query.length ? (
                    <p className="text-gray-400 px-8 text-sm mt-6">No documents with the given query were found.</p>
                ) : <></> ) : (
                    <div className="px-8"><Skeleton height={32} count={5} className="my-2"/></div>
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
