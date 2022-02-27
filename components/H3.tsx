const H3 = ({children, className=""} : {children: string, className?: string}) => {
    return (
        <h3 className={`font-bold text-gray-700 ${className}`}>{children}</h3>
    )
}

export default H3