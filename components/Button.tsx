import Link from "next/link";

export type ButtonProps = (React.HTMLProps<HTMLButtonElement> | React.HTMLProps<HTMLAnchorElement>) 
& {isLoading?: boolean, childClassName?: string}

export default function Button(props: ButtonProps) {
    const classNames = (
        props.className 
        + " p-2 relative" 
        + (props.disabled ? " cursor-not-allowed " : "") 
        + (props.isLoading ? " cursor-wait" : "")
    );
    const childClassNames = props.childClassName + (props.isLoading ? " invisible" : "")

    const newProps = {...props}
    delete newProps.isLoading
    delete newProps.children
    delete newProps.childClassName

    return props.href ? (
        <Link href={props.href}>
            {/* @ts-ignore */}
            <a {...newProps} className={classNames}>
                <div className={childClassNames}>{props.children}</div>
                {props.isLoading && <div className="loading-spinner"/>}
            </a>
            {/* By putting classNames after props, we have classNames take precedent over props.className */}
        </Link>
    ) : (
        // @ts-ignore
        <button {...newProps} className={classNames} disabled={props.disabled || props.isLoading}>
            <div className={childClassNames}>{props.children}</div>
            {props.isLoading && <div className="loading-spinner"/>}
        </button>
    );
}