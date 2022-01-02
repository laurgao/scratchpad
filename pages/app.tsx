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
import { Rnd } from 'react-rnd';
import Accordion from "react-robust-accordion";
import SimpleMDE from "react-simplemde-editor";
import useSWR, { SWRResponse } from "swr";
import Button from "../components/Button";
import Container from "../components/Container";
import H2 from "../components/H2";
import Input from "../components/Input";
import Modal from "../components/Modal";
import PrimaryButton from "../components/PrimaryButton";
import SEO from "../components/SEO";
import { FileModel } from "../models/File";
import { UserModel } from "../models/User";
import cleanForJSON from "../utils/cleanForJSON";
import dbConnect from "../utils/dbConnect";
import fetcher from "../utils/fetcher";
import { waitForEl } from "../utils/key";
import { DatedObj, FileObjGraph, FolderObjGraph, SectionObj, UserObj } from "../utils/types";

const mainContainerHeight = "calc(100vh - 97px)"

export default function App(props: { user: DatedObj<UserObj>, lastOpenedFile: DatedObj<FileObjGraph> }) {
    // App lifecycle
    const [iter, setIter] = useState<number>(0);
    const [error, setError] = useState<string>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Data
    const {data: foldersData, error: foldersError}: SWRResponse<{data: DatedObj<FolderObjGraph>[]}, any> = useSWR(`/api/folder?iter=${iter}`, fetcher);
    const [folders, setFolders] = useState<DatedObj<FolderObjGraph>[]>([]);

    // Current opened items
    const [openSection, setOpenSection] = useState<DatedObj<SectionObj>>(null);
    const [openFileId, setOpenFileId] = useState<string>(props.user.lastOpenedFile || "");
    const [openFolderId, setOpenFolderId] = useState<string>(props.lastOpenedFile ? props.lastOpenedFile.folder : "");
    const openFile: DatedObj<FileObjGraph> = (folders && folders.find(folder => folder.fileArr.filter(file => file._id === openFileId).length !== 0)) ? folders.find(folder => folder.fileArr.filter(file => file._id === openFileId).length !== 0).fileArr.find(file => file._id === openFileId) : null

    // Object creation/deletion
    const dateFileName = format(new Date(), "yyyy-MM-dd");
    const [newFileName, setNewFileName] = useState<string>(dateFileName);
    const [isNewFolder, setIsNewFolder] = useState<boolean>(false);
    const [newSectionName, setNewSectionName] = useState<string>("");
    const [isCreateNewSection, setIsCreateNewSection] = useState<boolean>(false);
    const [toDeleteItem, setToDeleteItem] = useState<any>(null);
    const [toDeleteItemForRightClick, setToDeleteItemForRightClick] = useState<any[]>([null, null, null]);

    // Saving
    const [sectionBody, setSectionBody] = useState<string>("");
    const [isSaved, setIsSaved] = useState<boolean>(true);

    const [hoverCoords, setHoverCoords] = useState<number[]>([null, null]);

    useEffect(() => {
        let firstOpenSection = (props.lastOpenedFile && props.lastOpenedFile.sectionArr) ? props.lastOpenedFile.sectionArr.find(d => d._id === props.lastOpenedFile.lastOpenSection) : null
        setOpenSection(firstOpenSection)
        setSectionBody(firstOpenSection ? firstOpenSection.body : "")
    }, [])

    useEffect(() => {if (openFileId && openSection) {
        setIsSaved(false);
        saveFile();
    }}, [sectionBody])
    useEffect(() => {setIsSaved(true);}, [openFileId])
    useEffect(() => {axios.post("/api/user", {lastOpenedFile: openFileId}).then(res => console.log(res.data.message)).catch(e => console.log(e))}, [openFileId])
    useEffect(() => {if (foldersData && foldersData.data) setFolders(foldersData.data)}, [foldersData])
    useEffect(() => {
        const x = document.getElementsByClassName("autosave")
        if (x && x.length > 0) x[x.length - 1].innerHTML = isSaved ? "Saved" : "Saving..."
    }, [isSaved])

    function onCreateNewFolder() {
        if (!openFolderId) setNewFileName("");
        else setNewFileName(dateFileName);
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
            setOpenSection(null);
        } else {
            setOpenSection(object);
            setSectionBody(object.body || "")
        }
    }
    function createNewFolder() {
        setIsLoading(true);
        if (!newFileName) setNewFileName("Untitled folder");

        axios.post("/api/folder", {
            name: newFileName,
        }).then(res => {
            if (res.data.error) {
                setError(res.data.error);
                setIsLoading(false);
            } else {
                console.log(res.data.message);
                setIter(iter + 1);
                setNewFileName(dateFileName);
            }
        }).catch(e => {
            setIsLoading(false);
            setError(e);
            console.log(e);
        });
    }

    function createNewFile() {
        setIsLoading(true);

        axios.post("/api/file", {
            name: newFileName,
            folder: openFolderId,
        }).then(res => {
            if (res.data.error) {
                setError(res.data.error);
                setIsLoading(false);
            } else {
                console.log(res.data.message);
                setIter(iter + 1);
                setNewFileName(dateFileName);
                setOpenFileId(res.data.id);
                setSectionBody("");
            }
        }).catch(e => {
            setIsLoading(false);
            setError(e);
            console.log(e);
        });
    }

    function saveFile() {
        setIsLoading(true);

        axios.post("/api/section", {
            id: openSection._id,
            body: sectionBody,
        }).then(res => {
            if (res.data.error) {
                setError(res.data.error);
                setIsLoading(false);
            } else {
                console.log(res.data.message);
                setIsSaved(true);
                setIter(iter + 1);
            }
        }).catch(e => {
            setIsLoading(false);
            setError(e);
            console.log(e);
        });
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
            if (res.data.error) {
                setError(res.data.error);
                setIsLoading(false);
            } else {
                console.log(res.data.message);
                setToDeleteItem(null);
                if (type === "file" && openFileId === fileId) setOpenFileId("");
                setIter(iter + 1);
            }
        }).catch(e => {
            setIsLoading(false);
            setError(e);
            console.log(e);
        });
    }   

    

    const RightClickMenu = ({file, x=0, y=0}) => {
        const thisMenu = useRef<HTMLDivElement>(null);
        useEffect(() => {
            const moreButtonClickHandler = e => {
                if (thisMenu.current !== null) {
                    const isNotButton = e.target !== thisMenu.current && !(thisMenu.current.contains(e.target));
                    if (isNotButton) {
                        setToDeleteItemForRightClick([null, null, null]);
                    }
                }
            };
    
            window.addEventListener('click', moreButtonClickHandler);
    
            return function cleanup(){
                window.removeEventListener("click", moreButtonClickHandler);
            }
        }, []);

        return file ? (
            <div ref={thisMenu} id={file._id} className="bg-white rounded-md shadow-lg z-10 fixed" style={{top: y, left: x}}>
                <Button onClick={() => {
                    setToDeleteItem(file);
                    setToDeleteItemForRightClick([null, null, null]);
                }} className="flex hover:bg-gray-50 p-4 items-center">
                    <FiTrash /><span className="ml-2">Delete</span>
                </Button>
            </div>
        ) : <></>
    }
    
    return (
        <>
        <SEO />
        {toDeleteItemForRightClick && <RightClickMenu file={toDeleteItemForRightClick[0]} x={toDeleteItemForRightClick[1]} y={toDeleteItemForRightClick[2]}/>}
        <Container className="flex appContainer overflow-y-hidden" width="full" padding={0} style={{height: mainContainerHeight}}>
            {toDeleteItem && <Modal isOpen={!!toDeleteItem} onRequestClose={() => setToDeleteItem(null)} small={true}>
                <div className="text-center">
                    <p>Are you sure you want to delete this {"user" in toDeleteItem ? "folder and all its files" : "file"}? This action cannot be undone.</p>
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <PrimaryButton 
                            onClick={() => deleteFile(toDeleteItem._id,"user" in toDeleteItem ? "folder" : "file")}
                            // isLoading={isLoading}
                        >Delete</PrimaryButton>
                        <Button onClick={() => setToDeleteItem(null)} className="font-semibold text-sm">Cancel</Button>
                    </div>
                </div>
            </Modal>}
            <Rnd 
                default={{x: 0, y: 0, width: 200, height: mainContainerHeight}} 
                minWidth={100} 
                maxHeight={mainContainerHeight} 
                style={{position: "static" }} 
                className="overflow-auto px-6 bg-gray-100" 
                disableDragging={true} 
                enableResizing={{right: true, bottom: false, bottomLeft: false, bottomRight: false, top: false, topLeft: false, topRight: false, left: false}}>
                <div className="text-xs text-gray-400 my-4">
                    {isNewFolder ? (
                        <>
                        <Input 
                            value={newFileName}
                            setValue={setNewFileName}
                            type="text"
                            placeholder={`New ${!openFolderId ? "folder" : "file"}`}
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
                        <>
                        <Button 
                            className="flex items-center"
                            onClick={onCreateNewFolder}
                            onMouseLeave={(e) => setHoverCoords([null, null])}
                            onMouseMove={e => setHoverCoords([e.clientX, e.clientY])}
                        >
                            <FaPlus/><p className="ml-2">New {!openFolderId ? "folder" : "file"}</p>
                        </Button>
                        {!!hoverCoords && <div 
                            className="bg-white border border-gray-400 p-1 z-50 absolute"
                            style={{left: (hoverCoords[0] + 20), top: (hoverCoords[1] - 48)}}
                        >(win) ctrl + /<br/>(mac) cmd + /</div>}
                        </>
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
                                        setToDeleteItemForRightClick([folder, e.clientX, e.clientY])
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
                                                setToDeleteItemForRightClick([file, e.clientX, e.clientY])
                                            }} 
                                            onClick={() => {
                                                setOpenFileId(file._id)
                                                let nextOpenSection = file.sectionArr ? file.sectionArr.find(d => d._id === file.lastOpenSection) : null
                                                setOpenSection(nextOpenSection)
                                                setSectionBody(nextOpenSection ? nextOpenSection.body : "")
                                            }}
                                        >{file.name}</p>
                                </div>
                            )}</div>
                        </Accordion>
                    </div>
                )}
            </Rnd>
            <div className="flex-grow px-10 overflow-y-auto pt-8">
                {error && (
                    <p className="text-red-500 font-bold text-center mb-8">{error}</p>
                )}
                {openFileId ? 
                <>
                {/* File title */}
                <div className="mb-4">
                    {openFile ? <H2>{openFile.name}</H2> : <Skeleton height={30}/>}
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
                                    placeholder="New section"
                                    onKeyDown={e => {
                                        if (e.key === "Enter") {
                                            console.log("Making new section!");
                                            axios.post("/api/section", {
                                                file: openFile._id,
                                                name: newSectionName,
                                            }).then(res => {
                                                if (res.data.error) {
                                                    setError(res.data.error);
                                                    setIsLoading(false);
                                                } else {
                                                    console.log(res.data.message);
                                                    setNewSectionName("");
                                                    setIter(iter + 1);
                                                }
                                            }).catch(e => {
                                                setIsLoading(false);
                                                setError(e);
                                                console.log(e);
                                            });
                                            setIsCreateNewSection(false);
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
                    {openFile && openFile.sectionArr.map(s => 
                        <>
                        <Accordion
                            key={`${s._id}-0`}
                            label={
                                <div className="flex p-2 items-center" style={{height: "30px"}}>
                                    <p>{s.name}</p>
                                    <FaAngleLeft size={14} className="ml-auto"/>
                                </div>
                            }                            
                            setOpenState={(event) => {
                                const isClickingOnOpenAccordion = !!openSection && openSection._id == s._id
                                handleSectionOnClickAccordion(event, s, isClickingOnOpenAccordion)
                                axios.post("/api/file", {
                                    id: openFileId, 
                                    lastOpenSection: isClickingOnOpenAccordion ? "null" : s._id
                                }).then(res => {
                                    console.log(res.data.message)
                                    setIter(prevIter => prevIter + 1)
                                }).catch(e => console.log(e))
                            }}
                            openState={openSection && openSection._id == s._id}
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
                    )}
                </div>

                </> : <div className="flex items-center justify-center text-center h-1/2">
                    <p>No file is open.<br/>Ctrl + / or Cmd + / to create a new {!openFolderId ? "folder to store your files" : "file"}.</p>
                </div>}
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
        let lastOpenedFile = [{}];
        if (thisUser.lastOpenedFile) {
            lastOpenedFile = await FileModel.aggregate([
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
        }
        return {props: {user: cleanForJSON(thisUser), lastOpenedFile: cleanForJSON(lastOpenedFile[0])}}
    } catch (e) {
        console.log(e);
        return {notFound: true};
    }
};
