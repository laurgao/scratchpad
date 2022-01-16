import Button, { ButtonProps } from "./Button"

const PrimaryButton = (props: ButtonProps) => {
    const classNames = (
        `bg-blue-400 text-white rounded-md transition font-semibold text-sm px-3 ` 
        + props.className 
        + ((props.disabled || props.isLoading) ? "" : " hover:bg-blue-700") 
    )
    return (
        <Button {...props} className={classNames}/>
    )
}

export default PrimaryButton