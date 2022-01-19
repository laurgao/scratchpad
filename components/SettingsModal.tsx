import { saveAs } from 'file-saver';
import JSZip from "jszip";
import 'mousetrap/plugins/global-bind/mousetrap-global-bind';
import { signOut, useSession } from "next-auth/client";
import { useState } from "react";
import Skeleton from "react-loading-skeleton";
import useSWR, { SWRResponse } from "swr";
import Button from "../components/Button";
import Modal from "../components/Modal";
import PrimaryButton from "../components/PrimaryButton";
import { A } from "../pages/index";
import fetcher from "../utils/fetcher";
import { DatedObj, FolderObjGraphWithSections } from "../utils/types";


const SettingsModal = ({isOpen, onRequestClose}: {isOpen: boolean, onRequestClose: () => any}) => {
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
                        console.error(e)
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

export default SettingsModal