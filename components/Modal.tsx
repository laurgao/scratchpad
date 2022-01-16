import { ReactNode } from 'react';
import ReactModal from "react-modal";

export default function Modal({isOpen, onRequestClose, children, small = false}: {
    isOpen: boolean,
    onRequestClose: any,
    children: ReactNode,
    small?: boolean,
}) {
    const modalClasses = "top-24 left-1/2 fixed bg-white rounded-md shadow-xl mx-4 " + (small ? "p-6" : "p-10");

    return (
        <ReactModal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            className={modalClasses}
            style={{content: {transform: "translateX(calc(-50% - 16px))", maxWidth: "calc(100% - 32px)", width: small ? 350 : 700}, overlay: {zIndex: 50}}}
        >
            {children}
        </ReactModal>
    );
}