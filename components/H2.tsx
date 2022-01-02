const H2 = ({children, className = ""} : {children: string, className?: string}) => {
    return (
        <p className={`text-3xl text-center font-semibold text-gray-700 ${className}`}>{children}</p>
    )
}

export default H2