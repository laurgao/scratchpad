import { ReactNode } from 'react';
import ReactModal from "react-modal";

export default function Modal({isOpen, onRequestClose, children, small = false, className="p-6"}: {
    isOpen: boolean,
    onRequestClose: any,
    children: ReactNode,
    small?: boolean,
    className?: string,
}) {
    const modalClasses = "top-24 left-1/2 fixed bg-white rounded-md shadow-xl mx-4 overflow-y-auto";

    return (
        <ReactModal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            className={modalClasses + " " + className}
            style={{content: {transform: "translateX(calc(-50% - 16px))", maxWidth: "calc(100% - 32px)", width: small ? 350 : 700, maxHeight: "calc(100vh - 200px)"}, overlay: {zIndex: 50}}}
        >
            {children}
        </ReactModal>
    );
}