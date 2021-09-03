import axios from "axios";
import { format } from "date-fns";
import { GetServerSideProps } from "next";
import { getSession } from "next-auth/client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ContextMenu, ContextMenuTrigger, MenuItem } from "react-contextmenu";
import { FaAngleDown, FaAngleRight, FaPlus } from "react-icons/fa";
import { FiTrash } from "react-icons/fi";
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
import { DatedObj, FolderObjGraph, UserObj } from "../utils/types";

export default function App(props: { user: DatedObj<UserObj> }) {
    const dateFileName = format(new Date(), "yyyy-MM-dd")
    const router = useRouter();
    const [error, setError] = useState<string>(null);
    const [iter, setIter] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [fileName, setFileName] = useState<string>(dateFileName);
    const [folders, setFolders] = useState<DatedObj<FolderObjGraph>[]>([]);
    const [body, setBody] = useState<string>("body text");
    const [isNewFolder, setIsNewFolder] = useState<boolean>(false);
    const {data: foldersData, error: foldersError}: SWRResponse<{data: DatedObj<FolderObjGraph>[]}, any> = useSWR(`/api/folder?iter=${iter}`, fetcher);
    const [textIsOpen, setTextIsOpen] = useState<number>(-1);
    const [selectedFileId, setSelectedFileId] = useState<string>("");
    const [toDeleteItem, setToDeleteItem] = useState<any>(null);
    
    useEffect(() => {if (selectedFileId) saveFile()}, [body])
    useEffect(() => {if (foldersData && foldersData.data) setFolders(foldersData.data)}, [foldersData])

    useKey("KeyN", (e) => {
        if (!isNewFolder) {
            setIsNewFolder(true);
            e.preventDefault();
            waitForEl("new-file");
        }
    });
    useKey("Enter", (e) => {
        if (isNewFolder) {
            e.preventDefault();
            onSubmit();
        }
    })

    const handleTextOnClick = (event: any, index: number, currentIsOpen: boolean) => {
        if (currentIsOpen) {
            setTextIsOpen(-1);
        } else {
            setTextIsOpen(index);
        }
    }
    function createNewFolder() {
        setIsLoading(true);

        axios.post("/api/folder", {
            name: fileName,
        }).then(res => {
            if (res.data.error) {
                setError(res.data.error);
                setIsLoading(false);
            } else {
                console.log("Folder created! ✨", res.data);
                setIter(iter + 1);
                setFileName("");
            }
        }).catch(e => {
            setIsLoading(false);
            setError("An unknown error occurred.");
            console.log(e);
        });
    }

    function createNewFile() {
        setIsLoading(true);

        axios.post("/api/file", {
            name: fileName,
            folder: foldersData.data[textIsOpen]._id,
        }).then(res => {
            if (res.data.error) {
                setError(res.data.error);
                setIsLoading(false);
            } else {
                console.log("File created! ✨", res.data);
                setIter(iter + 1);
                setFileName(dateFileName);
            }
        }).catch(e => {
            setIsLoading(false);
            setError("An unknown error occurred.");
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
                console.log("File saved! ✨", res.data);
                setIter(iter + 1);
            }
        }).catch(e => {
            setIsLoading(false);
            setError("An unknown error occurred.");
            console.log(e);
        });
    }

    function onSubmit() {
        if (textIsOpen === -1) {
            createNewFolder()
        } else {
            createNewFile()
        }
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
                console.log(`${type} deleted! ✨`, res.data);
                setToDeleteItem(null);
                if (type === "file" && selectedFileId === fileId) setSelectedFileId("");
                setIter(iter + 1);
            }
        }).catch(e => {
            setIsLoading(false);
            setError("An unknown error occurred.");
            console.log(e);
        });
    }
    
    return (
        <Container className="flex gap-12 h-screen overflow-hidden" width="full">
            <SEO />
            {toDeleteItem && <Modal isOpen={toDeleteItem} onRequestClose={() => setToDeleteItem(null)} small={true}>
                <div className="text-center">
                    <p>Are you sure you want to delete this {"user" in toDeleteItem ? "folder and all its files" : "file"}? This action cannot be undone.</p>
                    <div className="flex items-center gap-2 mt-2 justify-center">
                        <Button 
                            onClick={() => deleteFile(toDeleteItem._id,"user" in toDeleteItem ? "folder" : "file")}
                            // isLoading={isLoading}
                        >Delete</Button>
                        <Button onClick={() => setToDeleteItem(null)}>Cancel</Button>
                    </div>
                </div>
            </Modal>}
            <div style={{maxWidth: 150}}>
                {isNewFolder && <>
                    <Input 
                        value={fileName}
                        setValue={setFileName}
                        type="text"
                        placeholder={dateFileName}
                        my={0}
                        id="new-file"
                    />
                </>}
                <div className="text-xs text-gray-400 mb-8">
                    {isNewFolder ? <p>Enter to save</p> : <Button onClick={() => setIsNewFolder(true)} className="flex align-center">
                        <FaPlus/><p className="ml-2">New {textIsOpen === -1 ? "folder" : "file"} (n)</p>
                    </Button>}
                </div>
                {folders && folders.map((folder, index) => 
                    <div key={folder._id} >
                        <ContextMenuTrigger id={folder._id}>
                        <Accordion 
                            className="text-base text-gray-400 mb-2" 
                            label={
                                <div className={`flex ${textIsOpen == index && "border-2 border-blue-300"}`}>
                                    {textIsOpen == index ? <FaAngleDown className="text-gray-400"/> : <FaAngleRight className="text-gray-400"/>}
                                    <p className="ml-2 -mt-0.5">{folder.name}</p>
                                </div>
                            } 
                            open={true}
                            setOpenState={(event) => handleTextOnClick(event, index, textIsOpen == index)}
                            openState={textIsOpen == index}
                        >
                            <>
                            <div className="text-base text-gray-600 mb-6 mt-8">{folder.fileArr && folder.fileArr.map(file => 
                                <>
                                <ContextMenuTrigger id={file._id}>
                                    <p className={`${selectedFileId == file._id && "border-2 border-blue-300"}`} onClick={() => {
                                        setSelectedFileId(file._id)
                                        setBody(file.body)
                                    }}>{file.name}</p>
                                </ContextMenuTrigger>                                           
                    
                                <ContextMenu id={file._id} className="bg-white rounded-md shadow-lg z-10">
                                    <MenuItem onClick={() => setToDeleteItem(file)} className="flex hover:bg-gray-50 p-4">
                                        <FiTrash /><span className="ml-2 -mt-0.5">Delete</span>
                                    </MenuItem>
                                </ContextMenu>
                                </>
                            )}</div>
                            </>
                        </Accordion>
                        </ContextMenuTrigger>
                        <ContextMenu id={folder._id} className="bg-white rounded-md shadow-lg z-10">
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
                {selectedFileId && 
                <>
                <H2 className="mb-4">{folders && folders.find(folder => folder.fileArr.filter(file => file._id === selectedFileId).length !== 0).fileArr.find(file => file._id === selectedFileId).name}</H2>
                <SimpleMDE
                    id="helloworld"
                    onChange={setBody}
                    value={body}
                    options={{
                        spellChecker: false,
                        placeholder: "Unload your working memory ✨ ...",
                        toolbar: []
                    }}
                    className="overflow-y-auto"
                />
                </>}
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
        return thisUser ? {props: {user: cleanForJSON(thisUser)}} : {redirect: {permanent: false, destination: "/auth/welcome"}};
    } catch (e) {
        console.log(e);
        return {redirect: {permanent: false, destination: "/auth/welcome"}};
    }
};