import Button, { ButtonProps } from "./Button"

const PrimaryButton = (props: ButtonProps) => {
    const classNames = `bg-blue-400 text-white rounded-md transition font-semibold text-sm px-3 ` + props.className + (props.disabled ? "" : " hover:bg-blue-700")
    const newProps = {...props}
    newProps.className = classNames
    return (
        <Button {...newProps}/>
    )
}

export default PrimaryButton
