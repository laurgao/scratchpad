import axios from "axios";
import { format } from "date-fns";
import "easymde/dist/easymde.min.css";
import Mousetrap from "mousetrap";
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/client";
import { useEffect, useRef, useState } from "react";
import { FaAngleDown, FaAngleLeft, FaAngleRight, FaPlus } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import Skeleton from "react-loading-skeleton";
import Accordion from "react-robust-accordion";
import SimpleMDE from "react-simplemde-editor";
import useSWR, { SWRResponse } from "swr";
import Button from "../components/Button";
import Container from "../components/Container";
import H2 from "../components/H2";
import Input from "../components/Input";
import Modal from "../components/Modal";
import PrimaryButton from "../components/PrimaryButton";
import ResizableRight from "../components/ResizableRight";
import SEO from "../components/SEO";
import { FileModel } from "../models/File";
import { UserModel } from "../models/User";
import cleanForJSON from "../utils/cleanForJSON";
import dbConnect from "../utils/dbConnect";
import fetcher from "../utils/fetcher";
import { waitForEl } from "../utils/key";
import { DatedObj, FileObjGraph, FolderObjGraph, SectionObj, UserObj } from "../utils/types";

const AUTOSAVE_INTERVAL = 1000

export default function App(props: { user: DatedObj<UserObj>, lastOpenedFile: DatedObj<FileObjGraph> }) {
    // App lifecycle
    const [iter, setIter] = useState<number>(0);
    const [error, setError] = useState<string>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Data
    const {data: foldersData, error: foldersError}: SWRResponse<{data: DatedObj<FolderObjGraph>[]}, any> = useSWR(`/api/folder?iter=${iter}`, fetcher);
    const [folders, setFolders] = useState<DatedObj<FolderObjGraph>[]>([]);

    // Current opened items
    const [openSectionId, setOpenSectionId] = useState<string>(null);
    const [openFileId, setOpenFileId] = useState<string>(props.lastOpenedFile ? props.lastOpenedFile._id : "");
    const [openFolderId, setOpenFolderId] = useState<string>(props.lastOpenedFile ? props.lastOpenedFile.folder : "");
    const openFile: DatedObj<FileObjGraph> = (folders && folders.find(folder => folder.fileArr.filter(file => file._id === openFileId).length !== 0)) 
        ? folders.find(folder => folder.fileArr.filter(file => file._id === openFileId).length !== 0).fileArr.find(file => file._id === openFileId) 
        : null

    // Object creation/deletion
    const dateFileName = format(new Date(), "yyyy-MM-dd");
    const [newFileName, setNewFileName] = useState<string>(dateFileName);
    const [isNewFolder, setIsNewFolder] = useState<boolean>(false);
    const [newSectionName, setNewSectionName] = useState<string>("");
    const [isCreateNewSection, setIsCreateNewSection] = useState<boolean>(false);
    const [toDeleteItem, setToDeleteItem] = useState<any>(null);
    const [toDeleteItemForRightClick, setToDeleteItemForRightClick] = useState<any[]>(null);

    // Saving
    const [sectionBody, setSectionBody] = useState<string>("");
    const [isSaved, setIsSaved] = useState<boolean>(true);

    const [hoverCoords, setHoverCoords] = useState<number[]>(null);
    const mainContainerHeight = (openFileId && openSectionId) ? "calc(100vh - 97px)" : "calc(100vh - 53px)"
    const handleError = (e) => {
        console.log(e);
        setError(e.message);
    }

    useEffect(() => {
        let firstOpenSection = (props.lastOpenedFile && props.lastOpenedFile.sectionArr) 
            ? props.lastOpenedFile.sectionArr.find(d => d._id === props.lastOpenedFile.lastOpenSection) 
            : null
        // setOpenSection(firstOpenSection)
        setOpenSectionId(props.lastOpenedFile.lastOpenSection)
        setSectionBody(firstOpenSection ? firstOpenSection.body : "")
    }, [])

    useEffect(() => {if (openFileId && openSectionId) {
        setIsSaved(false);
    }}, [sectionBody])  

    useEffect(() => {
        const interval = setInterval(() => {
            if (openSectionId && !isSaved) saveFile(openSectionId, sectionBody)
            
        }, AUTOSAVE_INTERVAL);

        return () => clearInterval(interval); // This represents the unmount function, in which you need to clear your interval to prevent memory leaks.
    }, [sectionBody, isSaved])

    useEffect(() => {setIsSaved(true);}, [openFileId])
    const updateLastOpenedFile = (fileId) => axios.post("/api/user", {lastOpenedFile: fileId || ""}).then(res => console.log(res.data.message)).catch(handleError)
    useEffect(() => {if (foldersData && foldersData.data) setFolders(foldersData.data)}, [foldersData])
    useEffect(() => {
        const x = document.getElementsByClassName("autosave")
        if (x && x.length > 0) x[x.length - 1].innerHTML = isSaved ? "Saved" : "Saving..."
    }, [isSaved])

    function onCreateNewFolder() {
        if (!openFolderId) setNewFileName("");
        else setNewFileName(dateFileName);
        setHoverCoords(null);
        setIsNewFolder(true);
        waitForEl("new-file");
    }

    useEffect(() => {
        function onNewFolderShortcut(e) {
            e.preventDefault();
            if (!isNewFolder) onCreateNewFolder()
        }

        Mousetrap.bindGlobal(['command+/', 'ctrl+/'], onNewFolderShortcut);

        return () => {
            Mousetrap.unbind(['command+/', 'ctrl+/'], onNewFolderShortcut);
        };
    });


    const handleTextOnClick = (event: any, folderId: string, currentIsOpen: boolean) => {
        if (currentIsOpen) {
            setOpenFolderId("");
        } else {
            setOpenFolderId(folderId);
        }
    }
    const handleSectionOnClickAccordion = (event: any, object: DatedObj<SectionObj>, currentIsOpen: boolean) => {
        if (currentIsOpen) {
            setOpenSectionId(null);
        } else {
            setOpenSectionId(object._id);
            setSectionBody(object.body || "")
        }
    }
    function createNewFolder() {
        if (!newFileName) setNewFileName("Untitled folder");

        axios.post("/api/folder", {
            name: newFileName,
        }).then(res => {
            if (res.data.error) handleError(res.data.error)
            else {
                console.log(res.data.message);
                setIter(iter + 1);
                setNewFileName(dateFileName);
            }
        }).catch(handleError);
    }

    function createNewFile() {
        axios.post("/api/file", {
            name: newFileName,
            folder: openFolderId,
        }).then(res => {
            if (res.data.error) handleError(res.data.error);
            else {
                console.log(res.data.message);
                setIter(iter + 1);
                setNewFileName(dateFileName);
                setOpenFileId(res.data.id);
                setOpenSectionId(res.data.createdSectionId);
                setSectionBody("");
            }
        }).catch(handleError);
    }

    function saveFile(id, value) {
        console.log("saving...")

        axios.post("/api/section", {
            id: id,
            body: value,
        }).then(res => {
            if (res.data.error) handleError(res.data.error);
            else {
                console.log(res.data.message);
                setIsSaved(true);
                setIter(iter + 1);
            }
        }).catch(handleError);
    }

    function onSubmit() {
        if (!openFolderId) {
            createNewFolder()
        } else {
            createNewFile()
        }
        setIsNewFolder(false);
    }

    function deleteFile(fileId: string, type: "file" | "folder" = "file") {
        setIsLoading(true);

        axios.delete(`/api/${type}`, {
            data: {
                id: fileId,
            },
        }).then(res => {
            if (res.data.error) handleError(res.data.error);
            else {
                console.log(res.data.message);
                if (type === "file" && openFileId === fileId) {
                    setOpenFileId("");
                    updateLastOpenedFile("");
                }
                if (type === "folder" && toDeleteItem.fileArr.find(f => f._id === openFileId)) {
                    setOpenFileId("");
                    updateLastOpenedFile("");
                }
                setToDeleteItem(null);
                setIter(iter + 1);
            }
        }).catch(handleError).finally(() => setIsLoading(false));
    }    

    const RightClickMenu = ({file, x=0, y=0}) => {
        const thisMenu = useRef<HTMLDivElement>(null);
        useEffect(() => {
            const moreButtonClickHandler = e => {
                if (thisMenu.current !== null) {
                    const isNotButton = e.target !== thisMenu.current && !(thisMenu.current.contains(e.target));
                    if (isNotButton) {
                        setToDeleteItemForRightClick(null);
                    }
                }
            };
    
            window.addEventListener('click', moreButtonClickHandler);
    
            return function cleanup(){
                window.removeEventListener("click", moreButtonClickHandler);
            }
        }, []);

        return file ? (
            <div ref={thisMenu} id={file._id} className="bg-white shadow-md z-10 absolute text-sm border border-gray-300 text-gray-600" style={{top: y, left: x}}>
                <Button onClick={() => {
                    setToDeleteItem(file);
                    setToDeleteItemForRightClick([null, null, null]);
                }} className="flex hover:bg-gray-100 py-2 px-4 items-center">
                    <FiTrash /><span className="ml-2">Delete</span>
                </Button>
            </div>
        ) : <></>
    }
    
    return (
        <>
        <SEO />

        {(!foldersData && !folders.length) && 
            <div className="w-screen h-screen bg-black bg-opacity-80 absolute z-50 flex flex-col items-center justify-center top-0 left-0">
                <p className="text-center text-white text-lg mb-6">Loading files...</p>
                <div className="w-9/12 bg-gray-600 overflow-x-hidden relative" style={{
                    height: 20,
                    borderRadius: 10,
                }}>
                    <div className="loading-bar"></div>
                </div>
            </div>
        }

        {!!hoverCoords && 
            <div 
                className="bg-white border border-gray-400 p-1 z-50 absolute text-xs text-gray-400"
                style={{left: (hoverCoords[0] + 20), top: (hoverCoords[1])}}
            >(win) ctrl + /<br/>(mac) cmd + /</div>
        }

        {toDeleteItemForRightClick && <RightClickMenu file={toDeleteItemForRightClick[0]} x={toDeleteItemForRightClick[1]} y={toDeleteItemForRightClick[2]}/>}
        
        {toDeleteItem && <Modal isOpen={!!toDeleteItem} onRequestClose={() => setToDeleteItem(null)} small={true}>
            <div className="text-center">
                <p>Are you sure you want to delete this {"user" in toDeleteItem ? "folder and all its files" : "file"}? This action cannot be undone.</p>
                <div className="flex items-center justify-center gap-4 mt-6">
                    <PrimaryButton 
                        onClick={() => deleteFile(toDeleteItem._id,"user" in toDeleteItem ? "folder" : "file")}
                        isLoading={isLoading}
                    >Delete</PrimaryButton>
                    <Button onClick={() => setToDeleteItem(null)} className="font-semibold text-sm">Cancel</Button>
                </div>
            </div>
        </Modal>}

        <Container className="flex overflow-y-hidden" width="full" padding={0} style={{height: mainContainerHeight}}>
            <ResizableRight 
                defaultWidth={200}
                style={{height: mainContainerHeight}}
                draggedBorderHeight={mainContainerHeight}
                minWidth={100} 
                className="overflow-auto px-6 bg-gray-100 pb-4" 
            >
                <div className="text-xs text-gray-400 my-4">
                    {isNewFolder ? (
                        <>
                        <Input 
                            value={newFileName}
                            setValue={setNewFileName}
                            type="text"
                            placeholder={`${!openFolderId ? "Folder" : "File"} name`}
                            id="new-file"
                            className="text-base text-black"
                            onKeyDown={e => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    onSubmit();
                                } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    setIsNewFolder(false);
                                }
                            }}
                        />
                        {!!newFileName && <p>Enter to save<br/>Esc to exit</p>}
                        </>
                    ) : (
                        <Button 
                            className="flex items-center"
                            onClick={onCreateNewFolder}
                            onMouseLeave={(e) => setHoverCoords(null)}
                            onMouseMove={e => setHoverCoords([e.pageX, e.pageY])}
                        >
                            <FaPlus/><p className="ml-2">New {!openFolderId ? "folder" : "file"}</p>
                        </Button>
                    )}
                </div>
                {folders && folders.map(folder => 
                    <div key={folder._id} className="-mt-0.5">
                        <Accordion 
                            className="text-base text-gray-500 mb-1" 
                            label={
                                <div 
                                    className={`flex items-center rounded-md px-2 py-1`}
                                    onContextMenu={(e) => {
                                        e.preventDefault()
                                        setToDeleteItemForRightClick([folder, e.pageX, e.pageY])
                                    }}
                                >
                                    {openFolderId == folder._id ? <FaAngleDown/> : <FaAngleRight/>}
                                    <p className="ml-2">{folder.name}</p>
                                </div>
                            } 
                            open={true}
                            setOpenState={(event) => handleTextOnClick(event, folder._id, openFolderId == folder._id)}
                            openState={openFolderId == folder._id}
                        >
                            <div className="text-base text-gray-500 mb-2 ml-5 mt-1 overflow-x-visible">{folder.fileArr && folder.fileArr.map(file => 
                                <div key={file._id}>
                                    <p 
                                        className={`cursor-pointer rounded-md px-2 py-1 ${openFileId == file._id && "bg-blue-400 text-white"}`} 
                                        onContextMenu={(e) => {
                                            e.preventDefault()
                                            setToDeleteItemForRightClick([file, e.pageX, e.pageY])
                                        }} 
                                        onClick={() => {
                                            setOpenFileId(file._id);
                                            updateLastOpenedFile(file._id);
                                            let nextOpenSection = file.sectionArr ? file.sectionArr.find(d => d._id === file.lastOpenSection) : null
                                            setOpenSectionId(nextOpenSection ? nextOpenSection._id : "")
                                            setSectionBody(nextOpenSection ? nextOpenSection.body : "")
                                        }}
                                    >{file.name}</p>
                                </div>
                            )}</div>
                        </Accordion>
                    </div>
                )}
            </ResizableRight>
            <div className="flex-grow px-10 overflow-y-auto pt-8">
                {error && (
                    <p className="text-red-500 font-bold text-center mb-8">{error}</p>
                )}
                {(openFileId) ? 
                    <>
                    {/* File title */}
                    <div className="mb-4">
                        {openFile ? <H2>{openFile.name}</H2> : <div className="mx-auto w-full md:w-52 overflow-x-hidden"><Skeleton height={36}/></div>}
                    </div>
                    {/* File sections */}
                    <div className="text-base text-gray-400">
                        {openFile && <div className="flex flex-col">
                            {isCreateNewSection ? (
                                <div className="mb-4">
                                    <Input 
                                        value={newSectionName}
                                        setValue={setNewSectionName}
                                        id="new-section"
                                        placeholder="New section name"
                                        onKeyDown={e => {
                                            if (e.key === "Enter") {
                                                console.log("Making new section!");
                                                axios.post("/api/section", {
                                                    file: openFile._id,
                                                    name: newSectionName,
                                                }).then(res => {
                                                    if (res.data.error) handleError(res.data.error);
                                                    else {
                                                        console.log(res.data.message);
                                                        setIter(iter + 1);
                                                        setOpenSectionId(res.data.id);
                                                        setSectionBody("");
                                                        setNewSectionName("");
                                                    }
                                                }).catch(handleError).finally(() => setIsCreateNewSection(false));
                                            } else if (e.key === "Escape") {
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
                        {openFile && openFile.sectionArr.map(s => {
                            const thisSectionIsOpen = openSectionId == s._id
                            return (
                                <>
                                <Accordion
                                    key={`${s._id}-0`}
                                    label={
                                        <div className="flex p-2 items-center" style={{height: "30px"}}>
                                            <p>{s.name}</p>
                                            {thisSectionIsOpen ? <FaAngleDown size={14} className="ml-auto"/> : <FaAngleLeft size={14} className="ml-auto"/>}
                                        </div>
                                    }                            
                                    setOpenState={(event) => {
                                        handleSectionOnClickAccordion(event, s, thisSectionIsOpen)
                                        axios.post("/api/file", {
                                            id: openFileId, 
                                            lastOpenSection: thisSectionIsOpen ? "null" : s._id
                                        }).then(res => {
                                            console.log(res.data.message)
                                            setIter(prevIter => prevIter + 1)
                                        }).catch(handleError)
                                    }}
                                    openState={thisSectionIsOpen}
                                >
                                    <SimpleMDE
                                        id={`hellosection-${s._id}`}
                                        onChange={setSectionBody}
                                        value={sectionBody}
                                        options={{
                                            spellChecker: false,
                                            placeholder: "Unload your working memory ✨ ...",
                                            toolbar: []
                                        }}
                                        className="text-lg"
                                    />
                                </Accordion>                        
                                <hr key={`${s._id}-1`}/>
                                </>
                            )
                        })}
                    </div>
                    </> : <div className="flex items-center justify-center text-center h-1/2">
                        <p>No file is open.<br/>Ctrl + / or Cmd + / to create a new {!openFolderId ? "folder to store your files" : "file"}.</p>
                    </div>
                }
            </div>

        </Container>
        </>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const session = await getSession(context);

    if (!session) return {redirect: {permanent: false, destination: "/"}};

    try {
        await dbConnect();
        const thisUser = await UserModel.findOne({email: session.user.email});
        if (!thisUser) return {redirect: {permanent: false, destination: "/"}};
        let lastOpenedFile = {};
        if (thisUser.lastOpenedFile) {
            const lastOpenedFileArr = await FileModel.aggregate([
                {$match: {_id: thisUser.lastOpenedFile}},
                {
                    $lookup: {
                        from: "sections",
                        localField: "_id", // File field
                        foreignField: "file", //  Section field
                        as: "sectionArr",
                    }
                },
            ])
            if (lastOpenedFileArr.length) lastOpenedFile = lastOpenedFileArr[0]
        }
        return {props: {user: cleanForJSON(thisUser), lastOpenedFile: cleanForJSON(lastOpenedFile)}}
    } catch (e) {
        console.log(e);
        return {notFound: true};
    }
};
