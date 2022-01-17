import axios from "axios";
import { format } from "date-fns";
import { saveAs } from 'file-saver';
import JSZip from "jszip";
import Mousetrap from "mousetrap";
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';
import { GetServerSideProps } from "next";
import { getSession, signOut, useSession } from "next-auth/client";
import { useEffect, useRef, useState } from "react";
import { FaAngleDown, FaAngleRight, FaPlus } from "react-icons/fa";
import { FiSettings, FiTrash } from "react-icons/fi";
import Skeleton from "react-loading-skeleton";
import Accordion from "react-robust-accordion";
import useSWR, { SWRResponse } from "swr";
import Button from "../components/Button";
import Container from "../components/Container";
import FileWithSections from "../components/FileWithSections";
import Input from "../components/Input";
import LoadingBar from "../components/LoadingBar";
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
import { DatedObj, FileObjGraph, FolderObjGraph, FolderObjGraphWithSections, UserObj } from "../utils/types";
import { A } from "./index";


export default function App(props: { user: DatedObj<UserObj>, lastOpenedFile: DatedObj<FileObjGraph> }) {
    // App lifecycle
    const [iter, setIter] = useState<number>(0);
    const [error, setError] = useState<string>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Data
    const {data: foldersData, error: foldersError}: SWRResponse<{data: DatedObj<FolderObjGraph>[]}, any> = useSWR(`/api/folder?iter=${iter}`, fetcher);
    const [folders, setFolders] = useState<DatedObj<FolderObjGraph>[]>([]);

    // Current opened items
    const [openSectionId, setOpenSectionId] = useState<string>(props.lastOpenedFile.lastOpenSection);
    const [openFileId, setOpenFileId] = useState<string>(props.lastOpenedFile ? props.lastOpenedFile._id : "");
    const [openFolderId, setOpenFolderId] = useState<string>(props.lastOpenedFile ? props.lastOpenedFile.folder : "");

    // Object creation/deletion
    const dateFileName = format(new Date(), "yyyy-MM-dd");
    const [newFileName, setNewFileName] = useState<string>(dateFileName);
    const [isNewFolder, setIsNewFolder] = useState<boolean>(false);
    const [toDeleteItem, setToDeleteItem] = useState<any>(null);
    const [toDeleteItemForRightClick, setToDeleteItemForRightClick] = useState<any[]>(null);

    const [isSettings, setIsSettings] = useState<boolean>(false);
    const [hoverCoords, setHoverCoords] = useState<number[]>(null);
    const mainContainerHeight = (openFileId && openSectionId) ? "calc(100vh - 44px)" : "100vh"
    const handleError = (e) => {
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

        Mousetrap.bindGlobal(['command+/', 'ctrl+/'], onNewFolderShortcut);

        return () => Mousetrap.unbind(['command+/', 'ctrl+/'], onNewFolderShortcut);
    });


    const handleTextOnClick = (event: any, folderId: string, currentIsOpen: boolean) => {
        if (currentIsOpen) setOpenFolderId("");
        else setOpenFolderId(folderId);
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
                // setOpenSectionId(res.data.createdSectionId);
                // setSectionBody("");
            }
        }).catch(handleError);
    }

    function onSubmit() {
        if (!openFolderId) createNewFolder()
        else createNewFile()
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
                                            // let nextOpenSection = file.sectionArr ? file.sectionArr.find(d => d._id === file.lastOpenSection) : null
                                            // setOpenSectionId(nextOpenSection ? nextOpenSection._id : "")
                                            // setSectionBody(nextOpenSection ? nextOpenSection.body : "")
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
                {(openFileId) ? 
                    <FileWithSections
                        fileId={openFileId}
                        openSectionId={openSectionId}
                        setOpenSectionId={setOpenSectionId}
                        handleError={handleError}
                    /> : <div className="flex items-center justify-center text-center h-1/2">
                        <p>No file is open.<br/>Ctrl + / or Cmd + / to create a new {!openFolderId ? "folder to store your files" : "file"}.</p>
                    </div>
                }
            </div>
            <div className="w-12 flex items-end justify-center bg-gray-100">
                <Button onClick={() => setIsSettings(true)}><FiSettings className="text-gray-400" size={20}/></Button>
            </div>

        </Container>
        <SettingsModal isOpen={isSettings} onRequestClose={() => setIsSettings(false)}/>


        </>
    );
}


export const SettingsModal = ({isOpen, onRequestClose}: {isOpen: boolean, onRequestClose: () => any}) => {
    const {data: foldersData, error: foldersError}: SWRResponse<{data: DatedObj<FolderObjGraphWithSections>[]}, any> = useSWR(`/api/folder?includeSections=${true}`, fetcher);
    const [session, loading] = useSession();
    const [error, setError] = useState<string>(null);
    const [isLoading, setIsLoading] = useState<boolean>(null);
    return (
        <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
            <p className="mb-4">You are logged in as {loading ? <Skeleton/> : session.user.email}</p>
            <Button onClick={() => signOut()} className="border border-gray-400 text-gray-400 hover:bg-gray-400 hover:text-white rounded-md transition font-semibold text-sm block">Sign out</Button>
            
            <hr className="my-10"/>
            
            <PrimaryButton 
                isLoading={isLoading}
                disabled={!(foldersData && foldersData.data)}
                onClick={() => {
                    try {
                        if (foldersData && foldersData.data) {
                            setIsLoading(true);
                            setError(null);
                            var zip = new JSZip();

                            for (let folder of foldersData.data) {
                                var thisFolder = zip.folder(folder.name);

                                for (let file of folder.fileArr) {
                                    let markdownTextOfCombinedSections = "";
                                    for (let section of file.sectionArr) {
                                        markdownTextOfCombinedSections += "# " + (section.name || "")
                                        markdownTextOfCombinedSections += `
    `
                                        markdownTextOfCombinedSections += section.body || ""
                                        markdownTextOfCombinedSections += `


    `
                                    }
                                    thisFolder.file(`${file.name}.md`, markdownTextOfCombinedSections,);
                                }
                            }

                            zip.generateAsync({type:"blob"})
                            .then(function(content) {
                                saveAs(content, "scratchpad-data.zip");
                            })
                            .finally(() => setIsLoading(false));
                        }

                    } catch(e) {
                        setIsLoading(false);
                        setError(e.message)
                        console.log(e)
                    }

                }}
            >Export all files</PrimaryButton>
            {error && (
                <p className="text-red-500 font-bold mt-4">{error}</p>
            )}
            
            <hr className="my-10"/>

            <p>Want to report a bug? I&apos;d greatly appreciate if you contact me @ gaolauro@gmail.com or make an issue on <A href="https://github.com/laurgao/scratchpad/issues/new">GitHub</A>. Thank you :D</p>
        </Modal>

    )

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
