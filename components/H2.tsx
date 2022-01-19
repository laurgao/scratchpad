const H2 = ({children, className = ""} : {children: string, className?: string}) => {
    return (
        <h2 className={`text-3xl text-center font-semibold text-gray-700 font-mono ${className}`}>{children}</h2>
    )
}

export default H2