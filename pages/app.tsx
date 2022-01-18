import axios from "axios";
import { format } from "date-fns";
import Mousetrap from "mousetrap";
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/client";
import { useEffect, useRef, useState } from "react";
import { FaAngleDown, FaAngleRight, FaCog, FaPlus, FaSearch } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
import Accordion from "react-robust-accordion";
import useSWR, { SWRResponse } from "swr";
import Button from "../components/Button";
import Container from "../components/Container";
import FileWithSections from "../components/FileWithSections";
import Input from "../components/Input";
import LoadingBar from "../components/LoadingBar";
import Modal from "../components/Modal";
import PrimaryButton from "../components/PrimaryButton";
import QuickSwitcher from "../components/QuickSwitcher";
import ResizableRight from "../components/ResizableRight";
import SEO from "../components/SEO";
import SettingsModal from "../components/SettingsModal";
import { FileModel } from "../models/File";
import { UserModel } from "../models/User";
import cleanForJSON from "../utils/cleanForJSON";
import dbConnect from "../utils/dbConnect";
import fetcher from "../utils/fetcher";
import { waitForEl } from "../utils/key";
import { DatedObj, FileObjGraph, FolderObjGraph, UserObj } from "../utils/types";


export default function App(props: { user: DatedObj<UserObj>, lastOpenedFile: DatedObj<FileObjGraph> }) {
    // App lifecycle
    const [iter, setIter] = useState<number>(0);
    const [error, setError] = useState<string>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Data
    const {data: foldersData, error: foldersError}: SWRResponse<{data: DatedObj<FolderObjGraph>[]}, any> = useSWR(`/api/folder?iter=${iter}`, fetcher);
    const [folders, setFolders] = useState<DatedObj<FolderObjGraph>[]>([]);

    // Current opened items
    const [openFileId, setOpenFileId] = useState<string>(props.lastOpenedFile ? props.lastOpenedFile._id : "");
    const [openFolderId, setOpenFolderId] = useState<string>(props.lastOpenedFile ? props.lastOpenedFile.folder : "");

    // Object creation/deletion
    const dateFileName = format(new Date(), "yyyy-MM-dd");
    const [newFileName, setNewFileName] = useState<string>(dateFileName);
    const [isNewFolder, setIsNewFolder] = useState<boolean>(false);
    const [toDeleteItem, setToDeleteItem] = useState<any>(null);
    const [toDeleteItemForRightClick, setToDeleteItemForRightClick] = useState<any[]>(null);

    const [isSettings, setIsSettings] = useState<boolean>(false);
    const [isQuickSwitcher, setIsQuickSwitcher] = useState<boolean>(false);
    const [hoverCoords, setHoverCoords] = useState<number[]>(null);
    const [hoverCoordsForQuickSwitcher, setHoverCoordsForQuickSwitcher] = useState<{x: number, y: number}>(null);
    const mainContainerHeight = (openFileId) ? "calc(100vh - 44px)" : "100vh"
    const handleError = (e: Error) => {
        console.log(e);
        setError(e.message);
    }

    const updateLastOpenedFile = (fileId) => axios.post("/api/user", {lastOpenedFile: fileId || ""}).then(res => console.log(res.data.message)).catch(handleError)
    useEffect(() => {if (foldersData && foldersData.data) setFolders(foldersData.data)}, [foldersData])

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

        function onQuickSwitcherShortcut(e) {
            e.preventDefault();
            setIsQuickSwitcher(prev => !prev);
        }

        // Ctrl+p causes error in MDE but doesn't inturrupt anything in prod.
        Mousetrap.bindGlobal(['command+/', 'ctrl+/'], onNewFolderShortcut);
        Mousetrap.bindGlobal(['command+p', 'ctrl+p'], onQuickSwitcherShortcut);

        return () => {
            Mousetrap.unbind(['command+/', 'ctrl+/'], onNewFolderShortcut);
            Mousetrap.unbind(['command+p', 'ctrl+p'], onQuickSwitcherShortcut);
        }
    });

    function createNewFolder() {
        axios.post("/api/folder", {name: newFileName || "Untitled folder",})
            .then(res => {
                if (res.data.error) handleError(res.data.error)
                else {
                    console.log(res.data.message);
                    setIter(iter + 1);
                    setNewFileName(dateFileName);
                }
            })
            .catch(handleError);
    }

    function createNewFile() {
        axios.post("/api/file", {name: newFileName || "Untitled file", folder: openFolderId})
            .then(res => {
                if (res.data.error) handleError(res.data.error);
                else {
                    console.log(res.data.message);
                    setIter(iter + 1);
                    setNewFileName(dateFileName);
                    setOpenFileId(res.data.id);
                }
            })
            .catch(handleError);
    }

    function onSubmit() {
        if (!openFolderId) createNewFolder()
        else createNewFile()
        setIsNewFolder(false);
    }

    function deleteFile(fileId: string, type: "file" | "folder" = "file") {
        setIsLoading(true);

        axios.delete(`/api/${type}`, { data: { id: fileId }})
            .then(res => {
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
            })
            .catch(handleError)
            .finally(() => setIsLoading(false));
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
            <div 
                ref={thisMenu}
                id={file._id} 
                className="bg-white shadow-md z-20 absolute text-sm border border-gray-300 text-gray-600" 
                style={{top: y, left: x}}
            >
                <Button onClick={() => {
                    setToDeleteItem(file);
                    setToDeleteItemForRightClick([null, null, null]);
                }} className="hover:bg-gray-100 py-2 px-4" childClassName="flex items-center">
                    <FiTrash /><span className="ml-2">Delete</span>
                </Button>
            </div>
        ) : <></>
    }

    return (
        <>
        <SEO />

        {(!foldersData && !folders.length) && <LoadingBar/>}

        {!!hoverCoords && 
            <div 
                className="bg-white border border-gray-400 p-1 z-30 absolute text-xs text-gray-400"
                style={{left: (hoverCoords[0] + 20), top: (hoverCoords[1])}}
            >(win) ctrl + /<br/>(mac) cmd + /</div>
        }

        {!!hoverCoordsForQuickSwitcher && 
            <div 
                className="bg-white border border-gray-400 p-1 z-30 absolute text-xs text-gray-400"
                style={{right: `calc(100vh - ${hoverCoordsForQuickSwitcher.x - 330}px)`, top: (hoverCoordsForQuickSwitcher.y), maxWidth: 310}}
            >(win) ctrl + p<br/>(mac) cmd + p</div>
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
                        <p className={(newFileName && openFolderId) ? "" : "invisible"}>Enter to save<br/>Esc to exit</p>
                    ) : (
                        <Button 
                            childClassName="flex items-center"
                            onClick={onCreateNewFolder}
                            onMouseLeave={(e) => setHoverCoords(null)}
                            onMouseMove={e => setHoverCoords([e.pageX, e.pageY])}
                            onMouseEnter={e => setHoverCoords([e.pageX, e.pageY])}
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
                            setOpenState={(event) => {
                                // Handle only allowing 1 folder open at a time
                                if (openFolderId === folder._id) setOpenFolderId("");
                                else setOpenFolderId(folder._id);
                            }}
                            openState={openFolderId == folder._id}
                        >
                            <div className="text-base text-gray-500 mb-2 ml-5 mt-1 overflow-x-visible">
                                {(folder._id === openFolderId && isNewFolder) && (
                                    <div className="px-2 py-1">
                                        <Input 
                                            value={newFileName}
                                            setValue={setNewFileName}
                                            type="text"
                                            placeholder="File name"
                                            id="new-file"
                                            className="text-base text-gray-500"
                                            onKeyDown={e => {
                                                if (e.key === "Enter") onSubmit()
                                                else if (e.key === "Escape") setIsNewFolder(false)
                                            }}
                                        />
                                    </div>
                                )}
                                {folder.fileArr && folder.fileArr.map((file, idx) => 
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
                                            }}
                                        >{file.name}</p>
                                    </div>
                                )}</div>
                        </Accordion>
                    </div>
                )}
                {(isNewFolder && !openFolderId) && (
                    <>
                    <Input 
                        value={newFileName}
                        setValue={setNewFileName}
                        type="text"
                        placeholder="Folder name"
                        id="new-file"
                        className="text-base text-gray-500"
                        onKeyDown={e => {
                            if (e.key === "Enter") onSubmit();
                            else if (e.key === "Escape") setIsNewFolder(false);
                        }}
                    />
                    {!!newFileName && <p className="text-xs text-gray-400">Enter to save<br/>Esc to exit</p>}
                    </>
                )}
            </ResizableRight>
            <div className="flex-grow px-10 overflow-y-auto pt-8">
                {error && (
                    <p className="text-red-500 font-bold text-center mb-8">{error}</p>
                )}
                {openFileId ? (
                    <FileWithSections fileId={openFileId} handleError={handleError}/> 
                ) : (
                    <div className="flex items-center justify-center text-center h-1/2">
                        <p>No file is open.<br/>Ctrl + / or Cmd + / to create a new {!openFolderId ? "folder to store your files" : "file"}.</p>
                    </div>
                )}
            </div>
            <div className="w-12 flex flex-col justify-end align-center bg-gray-100 gap-2 mb-2">
                <Button 
                    onClick={() => setIsQuickSwitcher(true)}
                    onMouseLeave={(e) => setHoverCoordsForQuickSwitcher(null)}
                    onMouseMove={e => setHoverCoordsForQuickSwitcher({x: e.pageX, y: e.pageY})}
                    onMouseEnter={e => setHoverCoordsForQuickSwitcher({x: e.pageX, y: e.pageY})}
                ><FaSearch className="text-gray-400" size={20}/></Button>
                <Button onClick={() => setIsSettings(true)}><FaCog className="text-gray-400" size={20}/></Button>
            </div>

        </Container>
        <SettingsModal isOpen={isSettings} onRequestClose={() => setIsSettings(false)}/>
        <QuickSwitcher isOpen={isQuickSwitcher} onRequestClose={() => setIsQuickSwitcher(false)} setOpenFileId={setOpenFileId}/>


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
