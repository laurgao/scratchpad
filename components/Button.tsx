import Link from "next/link";

export type ButtonProps = (React.HTMLProps<HTMLButtonElement> | React.HTMLProps<HTMLAnchorElement>)

export default function Button(props: ButtonProps) {
    const {href, className, children} = props; // This does not alter props
    
    const classNames = "p-2 disabled:cursor-not-allowed " + className;

    return href ? (
        <Link href={href}>
            {/* @ts-ignore */}
            <a {...props} className={classNames}>{children}</a>
            {/* By putting classNames after props, we have classNames take precedent over props.className */}
        </Link>
    ) : (
        // @ts-ignore
        <button {...props} className={classNames}>{children}</button>
    );
}