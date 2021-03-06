import axios from "axios";
import React, { useEffect, useState } from 'react';
import { FaPlus } from "react-icons/fa";
import Skeleton from "react-loading-skeleton";
import useSWR, { SWRResponse } from "swr";
import fetcher from "../utils/fetcher";
import { waitForEl } from "../utils/key";
import { DatedObj, FileObjGraph } from "../utils/types";
import Button from "./Button";
import H2 from "./H2";
import Input from "./Input";
import SectionEditor from "./SectionEditor";

export interface SectionKwargsObj {
    sectionId: string,
    condition: "initiate-on-editing-title" | "initiate-with-cursor-on-bottom" | "initiate-on-specified-cursor-pos",
    initialCursorPos?: {line: number, ch: number}
};

const FileWithSections = ({fileId, handleError}: {
    fileId: string,
    handleError: (e: Error) => void,
}) => {
    const [openSectionId, setOpenSectionId] = useState<string>(null);

    // Data fetching & management
    const [iter, setIter] = useState<number>(0);
    const {data: fileData, error: fileError}: SWRResponse<{data: DatedObj<FileObjGraph>}, any> = useSWR(`/api/file?id=${fileId}&iter=${iter}`, fetcher);
    const [file, setFile] = useState<DatedObj<FileObjGraph>>(null);
    useEffect(() => {
        if (fileData && fileData.data) {
            setFile(fileData.data);
            setOpenSectionId(fileData.data.lastOpenSection);
        }
    }, [fileData])

    const [newSectionName, setNewSectionName] = useState<string>("");
    const [isCreateNewSection, setIsCreateNewSection] = useState<boolean>(false);

    // Used for passing information between sections
    // SectionEditor will run functions on open depending on sectionkwargs and will set sectionkwargs as null right after.
    const [sectionKwargs, setSectionKwargs] = useState<SectionKwargsObj>(null);

    return (
        <>
        {/* File title */}
        <div className="mb-4">
            {(file) ? <H2>{file.name}</H2> : <div className="mx-auto w-full md:w-52 overflow-x-hidden"><Skeleton height={36}/></div>}
        </div>
        
        {/* Create new section form */}
        <div className="text-base text-gray-400">
            {(file) && <div className="flex flex-col">
                {isCreateNewSection ? (
                    <div className="mb-4">
                        <Input 
                            value={newSectionName}
                            setValue={setNewSectionName}
                            id="new-section"
                            placeholder="New section name"
                            onKeyDown={e => {
                                if (e.key === "Enter") {
                                    axios.post("/api/section", { file: fileId, name: newSectionName || "", shouldBeLastOpenSection: true})
                                        .then(res => {
                                            if (res.data.error) handleError(res.data.error);
                                            else {
                                                console.log(res.data.message);
                                                setIter(iter + 1);
                                                setOpenSectionId(res.data.id);
                                                setNewSectionName("");
                                            }
                                        })
                                        .catch(handleError)
                                        .finally(() => setIsCreateNewSection(false));
                                }
                                else if (e.key === "Escape") {
                                    setIsCreateNewSection(false);
                                    setNewSectionName("");
                                }
                            }}
                        />
                        {!!newSectionName && <p className="text-xs">Enter to save<br/>Esc to exit</p>}
                    </div>
                ) : (
                    <Button onClick={() => {
                        setIsCreateNewSection(true);
                        waitForEl("new-section");
                    }} className="ml-auto"><FaPlus size={10}/></Button>
                )}
                <hr/>
            </div>}

            {/* File sections */}
            {(file) && file.sectionArr.map(s => {
                const thisSectionIsOpen = openSectionId == s._id
                return (
                    <SectionEditor
                        key={s._id} 
                        section={s} 
                        isOpen={thisSectionIsOpen}
                        // createSection={createSection}
                        handleError={handleError}
                        fileId={fileId}
                        setIter={setIter}
                        setOpenSectionId={setOpenSectionId}
                        sectionsOrder={file.sectionsOrder}
                        sectionKwargs={sectionKwargs}
                        setSectionKwargs={setSectionKwargs}
                    />
                )
            })}
        </div>
        </>
    )
}

export default FileWithSections
