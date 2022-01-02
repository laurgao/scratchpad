import Button, { ButtonProps } from "./Button"

const PrimaryButton = (props: ButtonProps) => {
    const classNames = "bg-blue-400 hover:bg-blue-700 text-white rounded-md transition font-semibold text-sm px-3 " + props.className
    const newProps = {...props}
    newProps.className = classNames
    return (
        <Button {...newProps}/>
    )
}

export default PrimaryButton
