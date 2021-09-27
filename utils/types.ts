export interface UserObj {
    email: string,
    name: string,
    image: string,
    lastOpenedFile?: string,
}

export interface FileObj {
    body?: string; 
    name: string; 
    folder: string; 
}

export interface FolderObj {
    user: string; 
    name: string; 
}

export interface FolderObjGraph extends FolderObj {
    fileArr: DatedObj<FileObj>[],
}

export interface SessionObj {
    user: {
        name: string,
        email: string,
        image: string,
    },
    userId: string,
    username: string,
}

// generic / type alias from https://stackoverflow.com/questions/26652179/extending-interface-with-generic-in-typescript
export type DatedObj<T extends {}> = T & {
    _id: string,
    createdAt: string, // ISO date
    updatedAt: string, // ISO date
}

export type IdObj<T extends {}> = T & {
    _id: string,
}