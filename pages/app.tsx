import axios from "axios";
import { format } from "date-fns";
import Mousetrap from "mousetrap";
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/client";
import { useEffect, useState } from "react";
import { ContextMenu, ContextMenuTrigger, MenuItem } from "react-contextmenu";
import ReactHover, { Hover, Trigger } from "react-hover";
import { FaAngleDown, FaAngleRight, FaPlus } from "react-icons/fa";
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
import SEO from "../components/SEO";
import { UserModel } from "../models/User";
import cleanForJSON from "../utils/cleanForJSON";
import dbConnect from "../utils/dbConnect";
import fetcher from "../utils/fetcher";
import { useKey, waitForEl } from "../utils/key";
import { DatedObj, FileObj, FolderObjGraph, UserObj } from "../utils/types";
import "easymde/dist/easymde.min.css";
import { FileModel } from "../models/File";

export default function App(props: { user: DatedObj<UserObj>, lastOpenedFile: DatedObj<FileObj> }) {
    const dateFileName = format(new Date(), "yyyy-MM-dd");
    const [error, setError] = useState<string>(null);
    const [iter, setIter] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [fileName, setFileName] = useState<string>(dateFileName);
    const [folders, setFolders] = useState<DatedObj<FolderObjGraph>[]>([]);
    const [body, setBody] = useState<string>(props.lastOpenedFile ? props.lastOpenedFile.body : "");
    const [isNewFolder, setIsNewFolder] = useState<boolean>(false);
    const {data: foldersData, error: foldersError}: SWRResponse<{data: DatedObj<FolderObjGraph>[]}, any> = useSWR(`/api/folder?iter=${iter}`, fetcher);
    const [openFolderId, setOpenFolderId] = useState<string>(props.lastOpenedFile ? props.lastOpenedFile.folder : "");
    const [selectedFileId, setSelectedFileId] = useState<string>(props.user.lastOpenedFile || "");
    const [toDeleteItem, setToDeleteItem] = useState<any>(null);
    const [isSaved, setIsSaved] = useState<boolean>(true);

    useEffect(() => {if (selectedFileId) {
        setIsSaved(false);
        saveFile();
    }}, [body])
    useEffect(() => {setIsSaved(true);}, [selectedFileId])
    useEffect(() => {axios.post("/api/user", {lastOpenedFile: selectedFileId}).then(res => console.log(res.data.message)).catch(e => console.log(e))}, [selectedFileId])
    useEffect(() => {if (foldersData && foldersData.data) setFolders(foldersData.data)}, [foldersData])
    useEffect(() => {
        const x = document.getElementsByClassName("autosave")
        if (x && x.length > 0) x[0].innerHTML = isSaved ? "Saved" : "Saving..."
    }, [isSaved])

    useKey("Enter", (e) => {
        if (isNewFolder) {
            e.preventDefault();
            onSubmit();
        }
    })
    useKey("Escape", (e) => {
        if (isNewFolder) {
            e.preventDefault();
            setIsNewFolder(false);
        }
    })

    function onCreateNewFolder() {
        if (!openFolderId) setFileName("");
        else setFileName(dateFileName);
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
    function createNewFolder() {
        setIsLoading(true);
        if (!fileName) setFileName("Untitled folder");

        axios.post("/api/folder", {
            name: fileName,
        }).then(res => {
            if (res.data.error) {
                setError(res.data.error);
                setIsLoading(false);
            } else {
                console.log(res.data.message);
                setIter(iter + 1);
                setFileName(dateFileName);
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
            name: fileName,
            folder: openFolderId,
        }).then(res => {
            if (res.data.error) {
                setError(res.data.error);
                setIsLoading(false);
            } else {
                console.log(res.data.message);
                setIter(iter + 1);
                setFileName(dateFileName);
                setSelectedFileId(res.data.id);
                setBody("");
            }
        }).catch(e => {
            setIsLoading(false);
            setError(e);
            console.log(e);
        });
    }

    function saveFile() {
        setIsLoading(true);

        axios.post("/api/file", {
            id: selectedFileId,
            body: body,
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
                if (type === "file" && selectedFileId === fileId) setSelectedFileId("");
                setIter(iter + 1);
            }
        }).catch(e => {
            setIsLoading(false);
            setError(e);
            console.log(e);
        });
    }
    
    return (
        <Container className="flex gap-12" width="full">
            <SEO />
            {toDeleteItem && <Modal isOpen={toDeleteItem} onRequestClose={() => setToDeleteItem(null)} small={true}>
                <div className="text-center">
                    <p>Are you sure you want to delete this {"user" in toDeleteItem ? "folder and all its files" : "file"}? This action cannot be undone.</p>
                    <div className="flex items-center justify-center gap-4 mt-2">
                        <Button 
                            onClick={() => deleteFile(toDeleteItem._id,"user" in toDeleteItem ? "folder" : "file")}
                            // isLoading={isLoading}
                        >Delete</Button>
                        <Button onClick={() => setToDeleteItem(null)}>Cancel</Button>
                    </div>
                </div>
            </Modal>}
            <div style={{width: 150}}>
                {isNewFolder && <>
                    <Input 
                        value={fileName}
                        setValue={setFileName}
                        type="text"
                        placeholder={`New ${!openFolderId ? "folder" : "file"}`}
                        my={0}
                        id="new-file"
                    />
                </>}
                <div className="text-xs text-gray-400 mb-6">
                    {isNewFolder ? <p>Enter to save<br/>Esc to exit</p> : 
                    <ReactHover options={{
                        followCursor: true,
                        shiftX: 20,
                        shiftY: 0,
                      }}>
                        <Trigger type="trigger">
                            <Button onClick={onCreateNewFolder} className="flex items-center w-full">
                                <FaPlus/><p className="ml-2">New {!openFolderId ? "folder" : "file"}</p>
                            </Button>
                        </Trigger>
                        <Hover type="hover">
                            <div className="transition bg-white border border-gray-400 p-1">(win) ctrl + /<br/>(mac) cmd + /</div>
                        </Hover>
                  </ReactHover>
                    }
                </div>
                {folders && folders.map(folder => 
                    <div key={folder._id} >
                        <ContextMenuTrigger id={folder._id}>
                        <Accordion 
                            className="text-base text-gray-400 mb-2" 
                            label={
                                <div className={`flex rounded-md border-2 pl-2 ${openFolderId == folder._id ? "border-blue-300" : "border-transparent"}`}>
                                    {openFolderId == folder._id ? <FaAngleDown className="text-gray-400"/> : <FaAngleRight className="text-gray-400"/>}
                                    <p className="ml-2 -mt-0.5">{folder.name}</p>
                                </div>
                            } 
                            open={true}
                            setOpenState={(event) => handleTextOnClick(event, folder._id, openFolderId == folder._id)}
                            openState={openFolderId == folder._id}
                        >
                            <div className="text-base text-gray-600 mb-6 ml-4 mt-2">{folder.fileArr && folder.fileArr.map(file => 
                                <div key={file._id}>
                                    <ContextMenuTrigger id={file._id}>
                                        <p className={`cursor-pointer rounded-md border-2 pl-2 ${selectedFileId == file._id ? "border-blue-300" : "border-transparent"}`} onClick={() => {
                                            setSelectedFileId(file._id);
                                            setBody(file.body || "");
                                        }}>{file.name}</p>
                                    </ContextMenuTrigger>                                           
                        
                                    <ContextMenu id={file._id} className="bg-white rounded-md shadow-lg z-10 cursor-pointer">
                                        <MenuItem onClick={() => setToDeleteItem(file)} className="flex hover:bg-gray-50 p-4">
                                            <FiTrash /><span className="ml-2 -mt-0.5">Delete</span>
                                        </MenuItem>
                                    </ContextMenu>
                                </div>
                            )}</div>
                        </Accordion>
                        </ContextMenuTrigger>
                        <ContextMenu id={folder._id} className="bg-white rounded-md shadow-lg z-10 cursor-pointer">
                            <MenuItem onClick={() => {setToDeleteItem(folder)}} className="flex hover:bg-gray-50 p-4">
                                <FiTrash /><span className="ml-2 -mt-0.5">Delete</span>
                            </MenuItem>
                        </ContextMenu>
                    </div>
                )}
            </div>
            <div className="prose content flex-grow">
                {error && (
                    <p className="text-red-500 mr-0">{error}</p>
                )}
                {selectedFileId ? 
                <>
                <div className="mb-4">
                {folders && (
                    folders.find(folder => folder.fileArr.filter(file => file._id === selectedFileId).length !== 0) ? 
                    <H2>{
                        folders.find(folder => folder.fileArr.filter(file => file._id === selectedFileId).length !== 0).fileArr.find(file => file._id === selectedFileId).name
                    
                    }</H2> : <Skeleton height={30}/>
                )}
                </div>
                <div>
                    <SimpleMDE
                        id="helloworld"
                        onChange={setBody}
                        value={body}
                        options={{
                            spellChecker: false,
                            placeholder: "Unload your working memory ✨ ...",
                            toolbar: []
                        }}
                    />
                </div>
                {/* <div className="text-xs opacity-30 mt-4">{isSaved ? <p>Saved</p> : <p>Saving...</p>}</div> */}
                </> : <div className="flex items-center justify-center text-center h-1/2">
                    <p>No file is open.<br/>Ctrl + / or Cmd + / to create a new {!openFolderId ? "folder to store your files" : "file"}.</p>
                </div>}
            </div>

        </Container>
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
        if (thisUser.lastOpenedFile) lastOpenedFile = await FileModel.findOne({_id: thisUser.lastOpenedFile})
        return {props: {user: cleanForJSON(thisUser), lastOpenedFile: cleanForJSON(lastOpenedFile)}}
    } catch (e) {
        console.log(e);
        return {notFound: true};
    }
};
