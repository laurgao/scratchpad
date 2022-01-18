export type UserObj = {
    email: string,
    name: string,
    image: string,
    lastOpenedFile?: string,
}

export type FileObj = {
    name: string; 
    folder: string; 
    lastOpenSection: string;
    sectionsOrder: string[];
}

export type SectionObj = {
    body?: string; 
    name?: string; 
    file: string; 
}

export type FolderObj = {
    user: string; 
    name: string; 
}

export type FileObjGraph = FileObj & { sectionArr: DatedObj<SectionObj>[] }
export type FolderObjGraph = FolderObj & { fileArr: DatedObj<FileObj>[] }
export type FolderObjGraphWithSections = FolderObj & { fileArr: DatedObj<FileObjGraph>[] }

// generic / type alias from https://stackoverflow.com/questions/26652179/extending-interface-with-generic-in-typescript
export type DatedObj<T extends {}> = T & {
    _id: string,
    createdAt: string, // ISO date
    updatedAt: string, // ISO date
}

export type IdObj<T extends {}> = T & {
    _id: string,
}